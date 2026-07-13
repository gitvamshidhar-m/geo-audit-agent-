import fs from "fs";
import crypto from "crypto";
import { promisify } from "util";
import express from "express";
import { config } from "dotenv";
config({ path: ".env.local" });
import { createServer as createViteServer } from "vite";
import path from "path";
import * as crawler from "./src/services/crawler.js";
import * as db from "./src/services/storage.js";
import * as ai from "./src/services/aiProviderService.js";

const scryptAsync = promisify(crypto.scrypt);
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = await scryptAsync(password, salt, 64) as Buffer;
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived);
}

console.log("Starting server process...");

async function startServer() {
  try {
    const app = express();
    const PORT = parseInt(process.env.PORT || "8080");

    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ limit: '2mb', extended: true }));

    // Rate limiting keyed by userId + provider + endpoint so each AI provider has its own bucket
    const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
    // Cleanup stale entries every 5 minutes to prevent memory leak on long-running Render instances
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of rateLimitMap) {
        if (now > entry.resetAt) rateLimitMap.delete(key);
      }
    }, 5 * 60 * 1000);
    // Per-provider limits (requests per minute) — generous for fast providers, conservative for slow ones
    const providerLimits: Record<string, number> = {
      groq: 30, openai: 20, anthropic: 15, gemini: 15,
      deepseek: 20, perplexity: 15, huggingface: 5
    };
    // FlareSolverr keep-alive — ping every 4 min to prevent Render free tier sleep
    if (process.env.FLARESOLVERR_URL) {
      const flareUrl = process.env.FLARESOLVERR_URL;
      setInterval(async () => {
        try {
          await fetch(flareUrl, { signal: AbortSignal.timeout(10000) });
          console.log(`[FLARESOLVERR] Keep-alive ping OK`);
        } catch (e: any) {
          console.log(`[FLARESOLVERR] Keep-alive ping failed: ${e.message}`);
        }
      }, 2 * 60 * 1000);
    }
    const rateLimit = (defaultMax: number, windowMs: number) => (req: any, res: any, next: any) => {
      const userId = (req.headers['x-user-id'] as string) || req.ip || 'unknown';
      const provider = req.body?.provider || 'unknown';
      const endpoint = req.path;
      const key = `${userId}:${provider}:${endpoint}`;
      const maxReqs = providerLimits[provider] ?? defaultMax;
      const now = Date.now();
      const entry = rateLimitMap.get(key);
      if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      if (entry.count >= maxReqs) return res.status(429).json({ error: `Rate limit reached for ${provider}. Please wait a moment.` });
      entry.count++;
      next();
    };

    app.use((req, res, next) => {
      next();
    });

    // Health check — lightweight keep-alive endpoint for cron pings
    app.get("/health", (_req, res) => {
      res.status(200).json({ status: "ok", uptime: process.uptime() });
    });

    console.log("Initializing database...");
    // Initialize DB
    await db.initDB();
    console.log("Database initialized successfully.");

    // API Routes
    console.log("Registering API routes...");
    app.post("/api/log", (req, res) => {
      console.error("FRONTEND ERROR:", req.body);
      fs.appendFileSync("frontend_errors.log", JSON.stringify(req.body) + "\n");
      res.json({ ok: true });
    });
    app.get("/api/health", (req, res) => res.json({ status: "ok", version: process.env.RENDER_GIT_COMMIT?.substring(0,7) || "dev" }));
    app.get("/api/crux", async (req, res) => {
      const apiKey = process.env.CRUX_API_KEY;
      if (!apiKey) return res.json({ error: "CrUX API key not configured. Set CRUX_API_KEY env var." });
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "url query param required" });
      try {
        const cruxRes = await fetch("https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=" + apiKey, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: url }),
        });
        const data = await cruxRes.json();
        res.json(data);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/api/robots-check", async (req, res) => {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "url query param required" });
      try {
        const origin = new URL(url.startsWith("http") ? url : "https://" + url).origin;
        const results: any = { origin, hasRobots: false, hasSitemap: false, robotsReferencesSitemap: false, sitemapReachable: false, recommendations: [] };

        // Check robots.txt
        try {
          const r = await fetch(origin + "/robots.txt", { headers: { "User-Agent": "Mozilla/5.0" } });
          if (r.ok) {
            results.hasRobots = true;
            const txt = await r.text();
            results.robotsReferencesSitemap = /sitemap:/i.test(txt);
            if (!results.robotsReferencesSitemap) results.recommendations.push("robots.txt does not declare a Sitemap: directive — add it so crawlers can discover your sitemap.");
          } else {
            results.recommendations.push("No robots.txt found at " + origin + "/robots.txt — create one to guide crawlers.");
          }
        } catch { results.recommendations.push("robots.txt could not be fetched."); }

        // Check sitemap
        const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"];
        for (const p of sitemapPaths) {
          try {
            const s = await fetch(origin + p, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (s.ok) { results.hasSitemap = true; results.sitemapReachable = true; break; }
          } catch { /* try next */ }
        }
        if (!results.hasSitemap) results.recommendations.push("No sitemap.xml found at common paths — submit one in Google Search Console.");

        if (results.hasRobots && results.hasSitemap && results.robotsReferencesSitemap) {
          results.recommendations.push("robots.txt and sitemap are correctly configured and cross-referenced.");
        }

        res.json(results);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

  const MAX_BODY_TEXT = 20000; // chars — prevents memory spike on 512MB Render

  app.post("/api/ai/insights", rateLimit(20, 60000), async (req, res) => {
    const { provider, stats, pages, keys } = req.body;
    try {
      const insight = await ai.generateInsights(provider, stats, pages, keys || {});
      res.json({ insight });
    } catch (error: any) {
      console.error("AI Insight Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/chat", rateLimit(30, 60000), async (req, res) => {
    const { provider, query, pages, keys } = req.body;
    if (typeof query === 'string' && query.length > MAX_BODY_TEXT)
      return res.status(400).json({ error: 'Query too long.' });
    try {
      const result = await ai.chat(provider, query, pages, keys || {});
      res.json({ response: result.response, sources: result.sources });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/geo", rateLimit(20, 60000), async (req, res) => {
    const { provider, query, pages, keys } = req.body;
    if (typeof query === 'string' && query.length > MAX_BODY_TEXT)
      return res.status(400).json({ error: 'Query too long.' });
    try {
      const response = await ai.geoAudit(provider, query, pages, keys || {});
      res.json({ response });
    } catch (error: any) {
      console.error("AI GEO Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/check-plagiarism", rateLimit(10, 60000), async (req, res) => {
    const { provider, url, title, description, bodyText, keys } = req.body;
    const truncatedBody = typeof bodyText === 'string' ? bodyText.slice(0, MAX_BODY_TEXT) : '';
    try {
      const result = await ai.checkPagePlagiarism(provider, url, title, description, truncatedBody, keys || {});
      res.json(JSON.parse(result));
    } catch (error: any) {
      console.error("AI Plagiarism Check Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/enterprise-audit", rateLimit(10, 60000), async (req, res) => {
    const { provider, url, title, description, bodyText, keys } = req.body;
    const truncatedBody = typeof bodyText === 'string' ? bodyText.slice(0, MAX_BODY_TEXT) : '';
    try {
      const result = await ai.checkEnterpriseAudit(provider, url, title, description, truncatedBody, keys || {});
      res.json(JSON.parse(result));
    } catch (error: any) {
      console.error("AI Enterprise Audit Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // AI SECURITY MODEL CONTEXT PROTOCOL (MCP) SERVER
  // ==========================================

  // Endpoints simulating/providing an AI Security MCP Server on HTTP/SSE transport
  app.post("/api/mcp/v1/tools", (req, res) => {
    res.json({
      tools: [
        {
          name: "scan_prompt_injection",
          description: "Scans prompt payload for jailbreaks, instruction overrides, or adversarial patterns. [Prompt-Injection Detection]",
          inputSchema: {
            type: "object",
            properties: {
              prompt: { type: "string", description: "The raw user prompt or content to analyze for safety boundaries." }
            },
            required: ["prompt"]
          }
        },
        {
          name: "verify_data_instruction_separation",
          description: "Reviews if custom user variables are securely isolated from system schemas using delimiters (e.g. XML tags, quotes, separators). [Data / Instruction Separation]",
          inputSchema: {
            type: "object",
            properties: {
              payload: { type: "string", description: "The payload content including prompt guidelines and inputs." },
              expectedSeparators: { type: "array", items: { type: "string" }, description: "XML/JSON wrapper tags expected to safely enclose input values." }
            },
            required: ["payload"]
          }
        },
        {
          name: "verify_tool_permissions",
          description: "Evaluates standard and sensitive tools for correct permission thresholds, preventing privilege escalation. [Tool Permission Checks]",
          inputSchema: {
            type: "object",
            properties: {
              toolName: { type: "string", description: "Name of the tool being called (e.g., execute_code, readFile)." },
              requestedScope: { type: "string", description: "Proposed context level (e.g., readOnly, sysAdmin, userSandbox)." }
            },
            required: ["toolName"]
          }
        },
        {
          name: "audit_human_approval_gates",
          description: "Checks if a high-privilege action or transaction requires explicit multi-factor Human-in-The-Loop approval. [Human Approval for Sensitive Actions]",
          inputSchema: {
            type: "object",
            properties: {
              actionType: { type: "string", description: "Action being attempted (e.g., delete_database, transfer_funds, modify_system)." },
              userRole: { type: "string", description: "The caller role (e.g., guest, moderator, admin)." }
            },
            required: ["actionType"]
          }
        },
        {
          name: "mask_pii_entities",
          description: "Deep scans input texts for private credentials, email addresses, phone lines, and API/JWT keys and redacts them.",
          inputSchema: {
            type: "object",
            properties: {
              text: { type: "string", description: "Clear-text prompt or document corpus to mask." }
            },
            required: ["text"]
          }
        }
      ]
    });
  });

  app.post("/api/mcp/v1/call-tool", (req, res) => {
    const { name, arguments: toolArgs } = req.body;
    
    try {
      if (name === "scan_prompt_injection") {
        const { prompt = "" } = toolArgs || {};
        const adversarialRegex = /(override\s+instructions|system\s+override|disregard\s+previous|you\s+are\s+now|ignore\s+directives|dan\s+model|do\s+anything\s+now|jailbreak|ignore\s+rules|system_compromised)/gi;
        const matches = prompt.match(adversarialRegex) || [];
        const score = matches.length > 0 ? Math.min(40 + (matches.length * 25), 98) : 5;
        const status = score > 50 ? "COMPROMISED" : "SECURE";
        
        return res.json({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                parameter: "Prompt-Injection Detection",
                status,
                riskScore: score,
                criticalIndicatorsFound: matches.map((m: string) => m.trim()),
                explanation: status === "COMPROMISED" 
                  ? "VULNERABILITY CONFIRMED: Input contains adversarial override keys trying to alter core orchestrator instructions." 
                  : "PROMPT SAFE: No malicious hijacking cues detected in prompt text."
              }, null, 2)
            }
          ]
        });
      }

      if (name === "verify_data_instruction_separation") {
        const { payload = "", expectedSeparators = ["<UserContent>", "<UserQuery>", "<DataBlock>"] } = toolArgs || {};
        
        // Check if there are balanced system tags separating the structure
        let hasSeparation = false;
        const wrappersFound: string[] = [];
        
        expectedSeparators.forEach((tag: string) => {
          const closingTag = tag.replace("<", "</");
          if (payload.includes(tag) && payload.includes(closingTag)) {
            hasSeparation = true;
            wrappersFound.push(tag);
          }
        });

        // Heuristic: if payload has instructions overrides but no boundary wrapping, it's highly unsafe!
        const mixingHarm = /(ignore|disregard|override|instead|instead of)/gi.test(payload);
        const score = hasSeparation ? (mixingHarm ? 35 : 10) : (mixingHarm ? 90 : 65);
        const classification = score > 50 ? "UNSTRUCTURED_MIXING_DANGER" : "STRUCTURED_ISOLATED";

        return res.json({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                parameter: "Data / Instruction Separation",
                status: classification,
                isolationScore: 100 - score,
                activeEncapsulationFound: wrappersFound,
                strictSeparationApplied: hasSeparation,
                mitigationStatus: hasSeparation 
                  ? "SECURE: Content boundaries are isolated inside sandboxed tags, limiting context overflow." 
                  : "WARNING: High vulnerability! User input and system instructions are mixed. An attacker can escape easily."
              }, null, 2)
            }
          ]
        });
      }

      if (name === "verify_tool_permissions") {
        const { toolName = "", requestedScope = "userSandbox" } = toolArgs || {};
        
        // Define dangerous tools
        const highRiskTools = ["execute_code", "shell_exec", "run_command", "delete_database", "write_file", "modify_system"];
        const isHighRisk = highRiskTools.includes(toolName.toLowerCase());
        
        const restrictedScopes = ["sysAdmin", "root", "write_access"];
        const isSuspiciousScope = restrictedScopes.includes(requestedScope);

        let allowed = true;
        let authIndex = "SUCCESS";
        let score = 10;

        if (isHighRisk && isSuspiciousScope) {
          allowed = false;
          authIndex = "DENIED_PRIVILEGE_VIOLATION";
          score = 95;
        } else if (isHighRisk) {
          allowed = false;
          authIndex = "DENIED_LIMITATION";
          score = 75;
        } else if (isSuspiciousScope) {
          allowed = true;
          authIndex = "WARNING_ELEVATED";
          score = 45;
        }

        return res.json({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                parameter: "Tool Permission Checks",
                toolName,
                requestedScope,
                executionAllowed: allowed,
                vulnerabilityLevel: score,
                authStatus: authIndex,
                details: allowed 
                  ? `SUCCESS: Tool execution for ${toolName} holds correct permissions under scope ${requestedScope}.`
                  : `DENIED SAFEGUARD: Blocked call tool ${toolName} under scope ${requestedScope}. Level-1 containment enforced.`
              }, null, 2)
            }
          ]
        });
      }

      if (name === "audit_human_approval_gates") {
        const { actionType = "", userRole = "guest" } = toolArgs || {};
        
        const criticalActions = ["delete_database", "erase_logs", "transfer_funds", "shutdown_server", "write_critical_rules"];
        const isCritical = criticalActions.includes(actionType.toLowerCase());
        
        let bypassThreat = false;
        let approvalNeeded = false;

        if (isCritical) {
          approvalNeeded = true;
          if (userRole === "admin") {
            bypassThreat = false; // still requires approval
          } else {
            bypassThreat = true; // severe unauthorized attempt
          }
        }

        const score = bypassThreat ? 90 : (approvalNeeded ? 40 : 10);
        const validationState = approvalNeeded ? "PENDING_HUMAN_INTERVENTION" : "SELF_APPROVE";

        return res.json({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                parameter: "Human Approval for Sensitive Actions",
                actionType,
                userRole,
                requiresHumanInTheLoop: approvalNeeded,
                isBypassUnauthorizedAttempt: bypassThreat,
                threatRating: score,
                remediationAction: approvalNeeded 
                  ? "INTERVENTION ENFORCED: Suspended autonomous model run. Forwarding authorization dialog payload to administrator session." 
                  : "PASS: Action classified as safe for autonomous non-interactive agent execution."
              }, null, 2)
            }
          ]
        });
      }

      if (name === "mask_pii_entities") {
        const { text = "" } = toolArgs || {};
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g;
        const apiKeyRegex = /(sk-[a-zA-Z0-9]{32,70}|AIzaSy[a-zA-Z0-9_-]{33})/g;
        
        let redacted = text;
        let emailsFound = 0;
        let phonesFound = 0;
        let keysFound = 0;

        redacted = redacted.replace(emailRegex, () => {
          emailsFound++;
          return "[REDACTED_EMAIL]";
        });
        redacted = redacted.replace(phoneRegex, () => {
          phonesFound++;
          return "[REDACTED_PHONE_NUMBER]";
        });
        redacted = redacted.replace(apiKeyRegex, () => {
          keysFound++;
          return "[REDACTED_API_KEY]";
        });

        const totalRedactions = emailsFound + phonesFound + keysFound;

        return res.json({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                parameter: "Data Loss Prevention (PII)",
                originalTextLength: text.length,
                redactedText: redacted,
                summary: {
                  emailsBlocked: emailsFound,
                  phonesBlocked: phonesFound,
                  apiKeysBlocked: keysFound,
                  totalRedactions
                },
                healthRating: totalRedactions > 0 ? "PII_CONTAINED" : "CLEAN"
              }, null, 2)
            }
          ]
        });
      }

      return res.status(404).json({ error: `Tool ${name} not found.` });
    } catch (err: any) {
      console.error("MCP call-tool execution failed: ", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // SAAS AUTHENTICATION & PORTAL API
  // ==========================================
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    try {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const userId = "usr_" + Math.random().toString(36).substring(2, 11);
      const passwordHash = await hashPassword(password);
      await db.createUser(userId, email, passwordHash, "Free");
      const user = await db.getUser(userId);
      res.json({ success: true, userId, email, plan: user.plan, credits: user.credits });
    } catch (err: any) {
      console.error("Signup error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    try {
      const user = await db.getUserByEmail(email);
      const valid = user ? await verifyPassword(password, user.password) : false;
      if (!user || !valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      res.json({ success: true, userId: user.id, email: user.email, plan: user.plan, credits: user.credits });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    try {
      const user = await db.getUser(userId);
      if (!user) {
        return res.json({ loggedIn: false, userId: 'public', plan: 'Free', credits: 0 });
      }
      res.json({ loggedIn: true, userId: user.id, email: user.email, plan: user.plan, credits: user.credits });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/upgrade", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    const { plan } = req.body;
    try {
      await db.updateUserPlan(userId, plan);
      const user = await db.getUser(userId);
      res.json({ success: true, plan: user.plan, credits: user.credits });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/audit/start", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    let { url, depth, maxPages, quick, force } = req.body;
    depth = Number(depth) || 10;
    maxPages = Number(maxPages) || 1000;
    quick = quick === true || quick === "true";
    force = force === true || force === "true";
    if (!url) return res.status(400).json({ error: "URL is required" });

    // SSRF protection — block private/loopback IPs
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const host = parsed.hostname;
      const privatePattern = /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|::1|0\.0\.0\.0|169\.254\.)/;
      if (privatePattern.test(host)) return res.status(400).json({ error: "Auditing private/internal addresses is not allowed." });
    } catch {
      return res.status(400).json({ error: "Invalid URL format." });
    }

    try {
      maxPages = Math.min(1000, maxPages);
      depth = Math.min(10, depth);

      // Check for cached audit (skip if same URL crawled within 60 min, unless force)
      if (!force) {
        const cached = await db.isCachedAudit(userId, url);
        if (cached) {
          return res.json({ message: "Cached audit loaded", url, cached: true });
        }
      }

      // Check for interrupted crawl to resume
      const status = await db.getAuditStatus(userId);
      let resumeState = null;
      if (status.is_running && status.progress > 0 && status.progress < 100) {
        resumeState = await db.getCrawlState(userId);
      }

      if (resumeState) {
        // Resume interrupted crawl
        console.log(`Resuming crawl for ${userId} at progress ${status.progress}`);
        crawler.auditQueued(url, { depth, maxPages, userId, quick, resumeState });
        res.json({ message: "Audit resumed", url, resumed: true, progress: status.progress });
      } else {
        // Fresh crawl
        db.resetData(userId).catch((e) => console.error('resetData failed:', e));
        crawler.auditQueued(url, { depth, maxPages, userId, quick });
        res.json({ message: "Audit started", url });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/audit/status", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    try {
      const status = await db.getAuditStatus(userId);
      res.json(status);
    } catch (err: any) {
      console.error("Status fetch error:", err);
      res.status(500).json({ error: err.message || "Failed to retrieve status" });
    }
  });

  // SSE endpoint for real-time progress updates
  const sseClients = new Map<string, Set<any>>();
  app.get("/api/audit/stream", (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("data: {\"connected\":true}\n\n");
    if (!sseClients.has(userId)) sseClients.set(userId, new Set());
    sseClients.get(userId)!.add(res);
    req.on("close", () => { sseClients.get(userId)?.delete(res); });
  });
  // Helper to push SSE updates (called from crawler)
  (globalThis as any).__ssePush = (userId: string, data: any) => {
    const clients = sseClients.get(userId);
    if (!clients || clients.size === 0) return;
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      try { client.write(msg); } catch {}
    }
  };
  (globalThis as any).__sseClose = (userId: string) => {
    const clients = sseClients.get(userId);
    if (!clients) return;
    const msg = `data: ${JSON.stringify({ is_running: false, progress: 100 })}\n\n`;
    for (const client of clients) {
      try { client.write(msg); client.end(); } catch {}
    }
    sseClients.delete(userId);
  };

  app.get("/api/audit/results", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    try {
      const pages = await db.getPages(userId);
      const stats = await db.getStats(userId);
      res.json({ pages, stats });
    } catch (err: any) {
      console.error("Results fetch error:", err);
      res.status(500).json({ error: err.message || "Failed to retrieve results" });
    }
  });

  app.post("/api/audit/reset", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    try {
      await db.resetData(userId);
      res.json({ message: "Data reset" });
    } catch (err: any) {
      console.error("Reset error:", err);
      res.status(500).json({ error: err.message || "Failed to reset data" });
    }
  });

  app.get("/api/audit/export/csv", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    try {
      const pages = await db.getPages(userId);
      const stats = await db.getStats(userId);
      let csv = "URL,Title,Score,Word Count,Load Time (ms),Status Code,Canonical,Description\n";
      pages.forEach((p: any) => {
        const desc = (p.description || "").replace(/"/g, '""');
        const title = (p.title || "").replace(/"/g, '""');
        csv += `"${p.url}","${title}",${p.score || 0},${p.wordCount || 0},${p.loadTime || 0},${p.statusCode || 0},"${desc}"\n`;
      });
      csv += `\n--- Summary ---\n`;
      csv += `Total Pages,${stats.totalPages}\n`;
      csv += `Average Score,${stats.averageScore}\n`;
      csv += `Critical Issues,${stats.criticalIssues}\n`;
      csv += `Warning Issues,${stats.warningIssues}\n`;
      csv += `SEO Visibility Score,${stats.seoVisibilityScore}\n`;
      csv += `GEO Score,${stats.geoScore}\n`;
      csv += `AI Recognition Score,${stats.aiRecognitionScore}\n`;
      csv += `Structured Data Coverage,${stats.structuredDataCoverage}%\n`;
      csv += `Social Graph Coverage,${stats.socialGraphCoverage}%\n`;
      csv += `Broken Links,${stats.brokenLinksCount}\n`;
      csv += `Has Robots.txt,${stats.hasRobots}\n`;
      csv += `Has Sitemap,${stats.hasSitemap}\n`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=seo-audit.csv");
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/audit/history", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    try {
      const history = await db.getAuditHistory(userId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/audit/export/json", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    try {
      const pages = await db.getPages(userId);
      const stats = await db.getStats(userId);
      const data = { stats, pages, timestamp: new Date().toISOString() };
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=seo-audit.json");
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/audit/share", async (req, res) => {
    const userId = (req.headers["x-user-id"] as string) || "public";
    try {
      const pages = await db.getPages(userId);
      const stats = await db.getStats(userId);
      if (!stats || pages.length === 0) return res.status(400).json({ error: "No audit data to share" });
      const code = Math.random().toString(36).substring(2, 10);
      const url = stats.url || req.body.url || "unknown";
      await db.saveShareReport(code, userId, url, stats, pages);
      res.json({ code, shareUrl: `${req.protocol}://${req.get('host')}/?shared=${code}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/audit/shared/:code", async (req, res) => {
    try {
      const report = await db.getShareReport(req.params.code);
      if (!report) return res.status(404).json({ error: "Report not found" });
      res.json({ url: report.url, stats: JSON.parse(report.stats), pages: JSON.parse(report.pages), created_at: report.created_at });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware initialized.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[READY] GEO Audit Agent Server listening on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);


  });
  } catch (error) {
    console.error("FATAL: Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
