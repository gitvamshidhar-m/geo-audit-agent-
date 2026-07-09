import fs from "fs";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as crawler from "./src/services/crawler.js";
import * as db from "./src/services/storage.js";
import * as ai from "./src/services/aiProviderService.js";

console.log("Starting server process...");

async function startServer() {
  try {
    const app = express();
    const PORT = parseInt(process.env.PORT || "8080");

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    app.use((req, res, next) => {
      next();
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
    app.get("/api/health", (req, res) => res.json({ status: "ok", version: "v4-quick", commit: "09a736c" }));
  
  app.post("/api/ai/insights", async (req, res) => {
    const { provider, stats, pages, keys } = req.body;
    try {
      const insight = await ai.generateInsights(provider, stats, pages, keys || {});
      res.json({ insight });
    } catch (error: any) {
      console.error("AI Insight Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const { provider, query, pages, keys } = req.body;
    try {
      const result = await ai.chat(provider, query, pages, keys || {});
      res.json({ response: result.response, sources: result.sources });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/geo", async (req, res) => {
    const { provider, query, pages, keys } = req.body;
    try {
      const response = await ai.geoAudit(provider, query, pages, keys || {});
      res.json({ response });
    } catch (error: any) {
      console.error("AI GEO Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/check-plagiarism", async (req, res) => {
    const { provider, url, title, description, bodyText, keys } = req.body;
    try {
      const result = await ai.checkPagePlagiarism(provider, url, title, description, bodyText || "", keys || {});
      res.json(JSON.parse(result));
    } catch (error: any) {
      console.error("AI Plagiarism Check Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/enterprise-audit", async (req, res) => {
    const { provider, url, title, description, bodyText, keys } = req.body;
    try {
      const result = await ai.checkEnterpriseAudit(provider, url, title, description, bodyText || "", keys || {});
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
      await db.createUser(userId, email, password, "Free");
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
      if (!user || user.password !== password) {
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
    let { url, depth, maxPages, quick } = req.body;
    depth = Number(depth) || 10;
    maxPages = Number(maxPages) || 1000;
    quick = quick === true || quick === "true";
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      // Safe maximum boundaries for crawling performance
      maxPages = Math.min(1000, maxPages);
      depth = Math.min(10, depth);

      // Start background crawl
      crawler.audit(url, { depth, maxPages, userId, quick }).catch(console.error);
      res.json({ message: "Audit started", url });
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

    // Self-keepalive ping every 10 minutes
    const baseUrl = `http://localhost:${PORT}`;
    setInterval(async () => {
      try {
        const resp = await fetch(`${baseUrl}/api/health`);
        console.log(`[Keepalive] pinged self: ${resp.status}`);
      } catch { /* ignore */ }
    }, 10 * 60 * 1000);
  });
  } catch (error) {
    console.error("FATAL: Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
