import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch";
import { analyzeHTML, quickAnalyzeHTML } from "./analyzer.js";
import * as db from "./storage.js";

chromium.use(StealthPlugin());

const isRender = !!(process.env.RENDER || process.env.NODE_ENV === 'production');

// Per-user audit queue — prevents concurrent SQLite writes from the same user
const auditQueue = new Map<string, Promise<void>>();
export function auditQueued(startUrl: string, config: AuditConfig) {
  const userId = config.userId || 'public';
  const prev = auditQueue.get(userId) || Promise.resolve();
  const next = prev.then(() => audit(startUrl, config)).catch(() => {});
  auditQueue.set(userId, next);
  next.finally(() => { if (auditQueue.get(userId) === next) auditQueue.delete(userId); });
  return next;
}

// ScraperAPI domain cache — activates on first fetch failure per domain
const scraperDomains = new Set<string>();

const MAP_CAP = 500;
function capSet<V>(s: Set<V>) { if (s.size > MAP_CAP) s.delete(s.values().next().value); }
function capMap<K, V>(m: Map<K, V>) { if (m.size >= MAP_CAP) { const first = m.keys().next().value; m.delete(first); } }

// In-memory cache: avoids re-fetching same URLs across audits
const urlCache = new Map<string, { html: string; finalUrl: string; headers: Record<string, string>; loadTime: number; time: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
function cacheGet(key: string) { const v = urlCache.get(key); if (v && Date.now() - v.time < CACHE_TTL_MS) return v; urlCache.delete(key); return null; }
function cacheSet(key: string, val: { html: string; finalUrl: string; headers: Record<string, string>; loadTime: number }) { if (urlCache.size >= MAP_CAP) { const first = urlCache.keys().next().value; urlCache.delete(first); } urlCache.set(key, { ...val, time: Date.now() }); }

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
];

// ── Adaptive Domain Intelligence ──────────────────────────────────────────────
// Learns per-domain crawl strategy at runtime so subpages reuse what worked
interface DomainProfile {
  fetchSuccess: number;
  playwrightNeeded: number;
  blocked: number;
  avgFetchMs: number;
  strategy: 'fetch' | 'playwright' | 'blocked';
  bestHeaderSet: number;
}
const domainProfiles = new Map<string, DomainProfile>();

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function getProfile(url: string): DomainProfile {
  const domain = getDomain(url);
  if (!domainProfiles.has(domain)) {
    capMap(domainProfiles);
    domainProfiles.set(domain, { fetchSuccess: 0, playwrightNeeded: 0, blocked: 0, avgFetchMs: 0, strategy: 'fetch', bestHeaderSet: 0 });
  }
  return domainProfiles.get(domain)!;
}

function updateProfile(url: string, result: 'fetch' | 'playwright' | 'blocked', fetchMs = 0, headerSetIdx = 0) {
  const p = getProfile(url);
  if (result === 'fetch') {
    p.fetchSuccess++;
    p.avgFetchMs = p.avgFetchMs === 0 ? fetchMs : (p.avgFetchMs * 0.8 + fetchMs * 0.2);
    p.bestHeaderSet = headerSetIdx;
  } else if (result === 'playwright') {
    p.playwrightNeeded++;
  } else {
    p.blocked++;
  }
  // Adapt strategy after 3+ samples
  const total = p.fetchSuccess + p.playwrightNeeded + p.blocked;
  if (total >= 3) {
    if (p.blocked / total > 0.6) p.strategy = 'blocked';
    else if (p.playwrightNeeded / total > 0.4) p.strategy = 'playwright';
    else p.strategy = 'fetch';
  }
}

// ── Cookie jar: persist cookies per domain across fetch requests ─────────────
const cookieJar = new Map<string, string>();
function getCookieHeader(url: string): string { return cookieJar.get(getDomain(url)) || ''; }
function storeCookies(url: string, setCookieHeader: string | null) {
  if (!setCookieHeader) return;
  const domain = getDomain(url);
  const existing = cookieJar.get(domain) || '';
  const newCookies = setCookieHeader.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  capMap(cookieJar);
  cookieJar.set(domain, existing ? `${existing}; ${newCookies}` : newCookies);
}

// ── Header rotation: Chrome, Mac Chrome, Googlebot (many sites whitelist it) ──
const headerSets = [
  {
    "User-Agent": userAgents[0],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
  },
  {
    "User-Agent": userAgents[1],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
  },
  {
    "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  },
  {
    // Bing bot — many WAFs whitelist major search crawlers
    "User-Agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  },
];


interface AuditConfig {
  depth: number;
  maxPages: number;
  userId?: string;
  quick?: boolean;
  resumeState?: { queue: { url: string; currentDepth: number }[]; visited: string[]; processedCount: number } | null;
}

export async function audit(startUrl: string, config: AuditConfig) {
  const { depth, maxPages, userId = "public", quick = false, resumeState } = config;
  const visited = new Set<string>();
  let sharedContext: any = null;

  let startUrlNormalized = startUrl.trim().replace(/\/$/, "").toLowerCase();
  if (
    !startUrlNormalized.startsWith("http://") &&
    !startUrlNormalized.startsWith("https://")
  ) {
    startUrlNormalized = `https://${startUrlNormalized}`;
  }

  // Restore resume state if available
  if (resumeState && resumeState.queue?.length > 0) {
    resumeState.visited.forEach((v: string) => visited.add(v));
    console.log(`Restored crawl state: ${visited.size} visited, ${resumeState.queue.length} queued, ${resumeState.processedCount} processed`);
  } else {
    visited.add(startUrlNormalized);
  }

  const queue: { url: string; currentDepth: number }[] = resumeState?.queue?.length
    ? resumeState.queue
    : [{ url: startUrlNormalized, currentDepth: 0 }];

  if (!resumeState) await db.resetData(userId);
  await db.updateStatus(userId, true, 0, startUrlNormalized);

  // Process sitemaps in parallel with crawl — start crawl immediately
  let hasRobots = false;
  let hasSitemap = false;
  const sitemapPromise = (async () => {
    try {
      const baseUrl = new URL(startUrlNormalized).origin;
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), quick ? 2000 : 5000);
      const robotsRes = await fetch(`${baseUrl}/robots.txt`, {
        headers: { "User-Agent": userAgents[0], Accept: "text/plain,text/html,*/*" },
        signal: ac.signal,
      }).catch(() => null);
      clearTimeout(tid);
      hasRobots = robotsRes?.ok || false;

      let sitemapCount = 0;
      const fetchSitemap = async (sUrl: string, d = 0): Promise<string[]> => {
        if (d > 2 || sitemapCount > (quick ? 1000 : 5000)) return [];
        const ac2 = new AbortController();
        const st2 = setTimeout(() => ac2.abort(), quick ? 2000 : 6000);
        const sr = await fetch(sUrl, {
          headers: { "User-Agent": userAgents[0], Accept: "application/xml,text/xml,*/*" },
          signal: ac2.signal,
        }).catch(() => null);
        clearTimeout(st2);
        if (!sr?.ok) return [];
        const txt = await sr.text();
        const locs = txt.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g);
        if (!locs) return [];
        const all: string[] = [];
        for (const loc of locs.map(u => u.replace(/<\/?loc>/g, "").trim())) {
          if (loc.endsWith(".xml") || loc.includes("sitemap")) {
            const sub = await fetchSitemap(loc, d + 1);
            all.push(...sub);
          } else {
            all.push(loc);
          }
        }
        return all;
      };

      let sitemapUrls: string[] = [];

      if (hasRobots && robotsRes) {
        const sm = (await robotsRes.text()).match(/Sitemap:\s*(https?:\/\/[^\s]+)/gi);
        if (sm) {
          for (const m of sm) {
            const urls = await fetchSitemap(m.replace(/Sitemap:\s*/i, "").trim());
            sitemapUrls.push(...urls);
            if (urls.length > 0) hasSitemap = true;
          }
        }
      }

      const commonResults = await Promise.allSettled(
        ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/sitemaps/sitemap.xml"].map(async (path) => {
          if (sitemapUrls.length > (quick ? 200 : 2000)) return [];
          const urls = await fetchSitemap(`${baseUrl}${path}`);
          if (urls.length > 0) hasSitemap = true;
          return urls;
        })
      );
      for (const r of commonResults) {
        if (r.status === "fulfilled") sitemapUrls.push(...r.value);
      }

      sitemapCount = sitemapUrls.length;
      const startHost = new URL(startUrlNormalized).hostname.replace(/^www\./, "");

      // Opportunistically check each URL matching the host domain
      for (const sUrl of sitemapUrls) {
        try {
          const sHost = new URL(sUrl).hostname.replace(/^www\./, "");
          if (sHost !== startHost) continue;
          const sKey = sUrl.trim().replace(/\/$/, "").toLowerCase();
          if (!visited.has(sKey)) {
            visited.add(sKey);
            queue.push({ url: sUrl, currentDepth: 1 });
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error("Sitemap processing error (non-fatal):", e);
    }
    db.updateSitemapFlags(userId, hasRobots, hasSitemap).catch(() => {});
  })();

  // Don't await sitemapPromise — crawl starts immediately

  const MAX_PLAYWRIGHTS = isRender ? 1 : 3;
  const BROWSER_IDLE_MS = isRender ? 8000 : 15000;
  const SCRAPER_TIMEOUT_MS = isRender ? 15000 : 25000;

  let processedCount = 0;
  let startedCount = 0;
  let activeWorkers = 0;
  let activePlaywrights = 0;
  let browser: any = null;
  let isLaunchingBrowser = false;
  let browserLastUsed = 0;
  const pageBuffer: any[] = [];
  let flushScheduled = false;

  async function closeBrowserIfIdle() {
    if (browser && browserLastUsed > 0 && Date.now() - browserLastUsed > BROWSER_IDLE_MS && activePlaywrights === 0) {
      try { await browser.close().catch(() => {}); } catch {}
      if (sharedContext) { try { await sharedContext.close().catch(() => {}); } catch {} }
      browser = null;
      sharedContext = null;
      console.log("Closed idle browser to free memory");
    }
  }
  async function flushPages() {
    if (pageBuffer.length === 0) return;
    const batch = pageBuffer.splice(0);
    try { await db.savePagesBatch(userId, batch); } catch (e) { console.error("Batch save failed:", e); }
  }

  async function getPageData(url: string, currentDepth: number) {
    if (processedCount >= maxPages) return;

    const progress = Math.min(
      99,
      Math.round((processedCount / maxPages) * 100),
    );
    db.updateStatus(
      userId,
      true,
      progress,
      `Audit [${startedCount}/${maxPages}]: ${url}`,
    ).catch(() => {});

    let htmlContent = "";
    let finalUrl = url;
    let headersMap: Record<string, string> = {};
    let lastErrorMessage = "";
    let pageLoadTime = 0;

    // Check in-memory cache before fetching
    const cacheKey = url.replace(/\/$/, "").toLowerCase();
    const cached = cacheGet(cacheKey);
    if (cached) {
      htmlContent = cached.html;
      finalUrl = cached.finalUrl;
      headersMap = cached.headers;
      pageLoadTime = cached.loadTime;
      const finalUrlKey = finalUrl.replace(/\/$/, "").toLowerCase();
      visited.add(finalUrlKey);
      visited.add(finalUrlKey.replace(/^https?:\/\/(www\.)?/, ""));
      visited.add(cacheKey);
    }

    if (!htmlContent) {
      try {
      // Try fetch first (Fast) with AbortController timeout
      // Use adaptive header set based on domain profile, rotate on failure
      try {
        const profile = getProfile(url);
        const startHeaderIdx = profile.bestHeaderSet;
        let usedHeaderIdx = startHeaderIdx;
        let fetchOk = false;

        for (let attempt = 0; attempt < headerSets.length && !fetchOk; attempt++) {
          usedHeaderIdx = (startHeaderIdx + attempt) % headerSets.length;
          const fetchStart = Date.now();
          const ac3 = new AbortController();
          const t3 = setTimeout(() => ac3.abort(), quick ? 5000 : 7000);
          let response: any = null;
          try {
            const cookies = getCookieHeader(url);
            response = await fetch(url, {
              headers: { ...headerSets[usedHeaderIdx], ...(cookies ? { Cookie: cookies } : {}) },
              signal: ac3.signal,
              redirect: "follow",
            });
          } catch (fetchErr: any) {
            clearTimeout(t3);
            lastErrorMessage = fetchErr.message || "Fetch failed";
            continue; // try next header set
          }
          clearTimeout(t3);
          pageLoadTime = Date.now() - fetchStart;

          finalUrl = response.url;
          const text = await Promise.race([
            response.text(),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Response body read timeout")), quick ? 5000 : 8000))
          ]);

          const lower = text.toLowerCase();
          const looksLikeABlock = !quick && (
            response.status === 403 ||
            response.status === 429 ||
            (text.length < 5000 &&
              (lower.includes("security check") ||
                lower.includes("cloudflare") ||
                (lower.includes("captcha") && text.length < 2000)))
          );

          // Store cookies for future requests to this domain
            storeCookies(url, response.headers.get('set-cookie'));

          if ((quick && response.status < 400) || (text.length > 50 && response.status < 400 && !looksLikeABlock)) {
            htmlContent = text;
            headersMap["x-actual-status"] = response.status.toString();
            response.headers.forEach((v: string, k: string) => { headersMap[k] = v; });
            const finalUrlKey = finalUrl.replace(/\/$/, "").toLowerCase();
            visited.add(finalUrlKey);
            visited.add(finalUrlKey.replace(/^https?:\/\/(www\.)?/, ""));
            visited.add(url.replace(/\/$/, "").toLowerCase());
            updateProfile(url, 'fetch', pageLoadTime, usedHeaderIdx);
            fetchOk = true;
            cacheSet(cacheKey, { html: text, finalUrl, headers: headersMap, loadTime: pageLoadTime });
          } else if (looksLikeABlock) {
            lastErrorMessage = "Fetch returned Cloudflare or Bot Challenge block page";
            // Don't break — try next header set (Googlebot/Bingbot often bypasses)
          } else if (response.status === 403 || response.status === 429) {
            lastErrorMessage = `HTTP ${response.status} - Access blocked by website`;
          }
        }

        if (!fetchOk && !htmlContent) {
          updateProfile(url, 'blocked');
        }
      } catch (e: any) {
        lastErrorMessage = e.message || "Fetch failed";
      }

      // Tier 2: Playwright — bot protection bypass (runs before ScraperAPI)
      // Fallback to Playwright ONLY if:
      // 1. Fetch completely failed (no content at all)
      // 2. AND not in quick mode
      // 3. AND ScraperAPI didn't already resolve it
      const isLikelySPA = !htmlContent || (htmlContent.length < 800 && htmlContent.toLowerCase().includes('<script') && !htmlContent.toLowerCase().includes('<body'));
      const isBlocked403 = !htmlContent && (lastErrorMessage.includes('403') || lastErrorMessage.toLowerCase().includes('cloudflare') || lastErrorMessage.toLowerCase().includes('block'));
      // Only use Playwright if ScraperAPI didn't already resolve it
      const shouldTryPlaywright = !quick && (isLikelySPA || isBlocked403) && !headersMap['x-via'];

      if (shouldTryPlaywright) {
          // Wait if too many Playwright instances are running to prevent memory crashes
          while (activePlaywrights >= MAX_PLAYWRIGHTS) {
            await new Promise((r) => setTimeout(r, 50));
          }
          activePlaywrights++;

          try {
            if (!browser) {
              while (isLaunchingBrowser) {
                await new Promise((r) => setTimeout(r, 100));
              }
              if (!browser) {
                isLaunchingBrowser = true;
                try {
                  const chromiumArgs = [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--single-process",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-blink-features=AutomationControlled",
                    ...(isRender ? [
                      "--disable-gpu",
                      "--no-zygote",
                      "--memory-pressure-off",
                      "--js-flags=--max-old-space-size=128",
                    ] : [])
                  ];
                  browser = await chromium.launch({ headless: true, args: chromiumArgs });
                  console.log('Playwright browser launched');
                } catch (launchErr: any) {
                  console.error("Playwright failed to launch:", launchErr.message);
                } finally {
                  isLaunchingBrowser = false;
                }
              }
            }

            if (browser) {
              if (!sharedContext) {
                const pwUA = userAgents[Math.floor(Math.random() * (userAgents.length - 1))]; // exclude Googlebot for Playwright
                sharedContext = await browser.newContext({
                  userAgent: pwUA,
                  viewport: { width: 1280 + Math.floor(Math.random() * 120), height: 800 + Math.floor(Math.random() * 80) },
                  locale: 'en-US',
                  timezoneId: 'America/New_York',
                  extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
                  bypassCSP: true,
                  ignoreHTTPSErrors: true,
                });
                // Stealth: inject before every page to spoof automation fingerprints
                await sharedContext.addInitScript(() => {
                  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                  (window as any).chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
                  // Canvas fingerprint noise
                  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
                  HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
                    const ctx = this.getContext('2d');
                    if (ctx) {
                      const imageData = ctx.getImageData(0, 0, this.width, this.height);
                      for (let i = 0; i < imageData.data.length; i += 100) imageData.data[i] ^= 1;
                      ctx.putImageData(imageData, 0, 0);
                    }
                    return origToDataURL.call(this, type);
                  };
                });
              }

              const page = await sharedContext.newPage();

              // Optimization: Block heavy resources and non-essential trackers/analytics to speed up crawl tremendously
              await page.route('**/*', (route) => {
                const urlStr = route.request().url().toLowerCase();
                const isAsset = 
                  urlStr.endsWith('.png') || urlStr.endsWith('.jpg') || urlStr.endsWith('.jpeg') ||
                  urlStr.endsWith('.gif') || urlStr.endsWith('.webp') || urlStr.endsWith('.svg') ||
                  urlStr.endsWith('.woff') || urlStr.endsWith('.woff2') || urlStr.endsWith('.ttf') ||
                  urlStr.endsWith('.css') || urlStr.endsWith('.mp4') || urlStr.endsWith('.mp3');
                
                const isTracker = 
                  urlStr.includes('analytics') || urlStr.includes('tracker') || 
                  urlStr.includes('gtm.js') || urlStr.includes('analytics.js') ||
                  urlStr.includes('facebook') || urlStr.includes('hotjar') || 
                  urlStr.includes('doubleclick') || urlStr.includes('intercom') ||
                  urlStr.includes('google-analytics');

                if (isAsset || isTracker) {
                  return route.abort();
                }
                return route.continue();
              });

try {
                    const pwStart = Date.now();
                    let resp = await page
                      .goto(url, { waitUntil: "domcontentloaded", timeout: quick ? 3000 : 5000 })
                  .catch((err) => {
                    lastErrorMessage = err.message || "Playwright goto failed";
                    return null;
                  });
                if (!pageLoadTime) pageLoadTime = Date.now() - pwStart;
                
                // Cloudflare Bypass Attempt
                const title = await page.title().catch(() => "");
                const isBlocked = 
                  title.toLowerCase().includes("just a moment") ||
                  title.toLowerCase().includes("cloudflare") ||
                  title.toLowerCase().includes("attention required");

                if (isBlocked) {
                  db.updateStatus(userId, true, progress, `Bypassing Cloudflare Challenge: ${url}`).catch(() => {});
                  // Wait for cf-clearance cookie — Cloudflare JS challenge resolves in ~5s
                  const cfResolved = await Promise.race([
                    page.waitForFunction(() => document.cookie.includes('cf-clearance'), { timeout: 8000 }).then(() => true).catch(() => false),
                    new Promise<boolean>(r => setTimeout(() => r(false), 8000))
                  ]);
                  if (!cfResolved) {
                    // Simulate human interaction as fallback
                    await page.mouse.move(200 + Math.random() * 300, 200 + Math.random() * 300).catch(() => {});
                    await page.waitForTimeout(500);
                    await page.mouse.click(200 + Math.random() * 300, 200 + Math.random() * 300).catch(() => {});
                    await page.waitForTimeout(2000);
                  }
                  // Extract cf-clearance and store in cookie jar for future fetch requests
                  const cfCookies = await page.context().cookies().catch(() => []);
                  const cfClearance = cfCookies.find((c: any) => c.name === 'cf-clearance');
                  if (cfClearance) {
                    storeCookies(url, `cf-clearance=${cfClearance.value}`);
                    console.log(`Stored cf-clearance cookie for ${getDomain(url)}`);
                  }
                  // Reload after challenge resolution
                  await page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
                } else if (currentDepth === 0) {
                  if (!quick) {
                    await page.waitForTimeout(400);
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)).catch(() => {});
                    await page.waitForTimeout(200);
                    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
                  }
                } else {
                  if (!quick) await page.waitForTimeout(300);
                }

                finalUrl = page.url();
                htmlContent = await Promise.race([
                  page.content(),
                  new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Playwright content timeout")), 5000))
                ]);
                headersMap = (await resp?.allHeaders()) || {};
                if (resp) {
                   headersMap["x-actual-status"] = resp.status().toString();
                }
                browserLastUsed = Date.now();
                updateProfile(url, 'playwright');

                const finalUrlKey = finalUrl.replace(/\/$/, "").toLowerCase();
                visited.add(finalUrlKey);
                visited.add(finalUrlKey.replace(/^https?:\/\/(www\.)?/, ""));
              } catch (pwErr: any) {
                console.error(
                  `Playwright fallback failed for ${url}:`,
                  pwErr.message,
                );
                lastErrorMessage = pwErr.message || "Playwright headless crash or error";
              } finally {
                await page?.close().catch(() => {});
              }
            }
          } finally {
            activePlaywrights--;
          }
      }

      // Tier 3: ScraperAPI — last resort, only if Playwright also failed
      if (!htmlContent && process.env.SCRAPER_API_KEY) {
        const domain = getDomain(url);
        if (!scraperDomains.has(domain)) {
          capSet(scraperDomains);
          scraperDomains.add(domain);
        }
      }
      if (!htmlContent && process.env.SCRAPER_API_KEY && scraperDomains.has(getDomain(url))) {
        try {
          const scraperUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true`;
          const ac = new AbortController();
          const t = setTimeout(() => ac.abort(), SCRAPER_TIMEOUT_MS);
          const scraperRes = await fetch(scraperUrl, { signal: ac.signal }).catch(() => null);
          clearTimeout(t);
          if (scraperRes?.ok) {
            const text = await scraperRes.text().catch(() => '');
            if (text.length > 50) {
              htmlContent = text;
              finalUrl = url;
              headersMap['x-actual-status'] = scraperRes.status.toString();
              headersMap['x-via'] = 'scraperapi';
              updateProfile(url, 'fetch', 0, 0);
              db.updateStatus(userId, true, progress, `ScraperAPI bypass: ${url}`).catch(() => {});
            }
          } else if (scraperRes) {
            console.error(`ScraperAPI returned ${scraperRes.status} for ${url}`);
          }
        } catch (e: any) {
          console.error(`ScraperAPI failed for ${url}:`, e.message);
        }
      }
    } catch (e: any) {
      console.error(`Outer crawl logic failed for ${url}:`, e.message);
      lastErrorMessage = e.message || "Unknown crawl error";
    } }

    // ALWAYS increment and save result (success or failure) to avoid UI getting stuck
    processedCount++;

    // Persist crawl state every 50 pages for resume support
    if (processedCount % 50 === 0) {
      db.saveCrawlState(userId, {
        queue: queue.slice(0, 1000),
        visited: Array.from(visited).slice(0, 5000),
        processedCount
      }).catch(() => {});
    }

    if (htmlContent && htmlContent.length > 50) {
      const loadTime = pageLoadTime;
      const isRoot = currentDepth === 0;
      const pageData = isRoot ? analyzeHTML(finalUrl, htmlContent, loadTime, headersMap) : quickAnalyzeHTML(finalUrl, htmlContent, loadTime, headersMap);

      pageBuffer.push(pageData);
      if (!flushScheduled) {
        flushScheduled = true;
        setTimeout(() => { flushScheduled = false; flushPages(); }, 200);
      }
      if (pageBuffer.length >= 20) await flushPages();

      if (currentDepth < depth && processedCount < maxPages) {
        const queueBudget = maxPages * 2 - processedCount;
        let added = 0;
        for (const link of pageData.links.internal) {
          if (added >= queueBudget) break;
          const linkKey = link.trim().replace(/\/$/, "").toLowerCase();
          if (!visited.has(linkKey)) {
            visited.add(linkKey);
            queue.push({ url: link, currentDepth: currentDepth + 1 });
            added++;
          }
        }
      }
    } else {
      console.log(`Saving fallback restricted page for ${url}`);
      
      const isConnectionError = 
        lastErrorMessage.toLowerCase().includes("dns") ||
        lastErrorMessage.toLowerCase().includes("enotfound") ||
        lastErrorMessage.toLowerCase().includes("econnrefused") ||
        lastErrorMessage.toLowerCase().includes("name_not_resolved") ||
        lastErrorMessage.toLowerCase().includes("address") ||
        lastErrorMessage.toLowerCase().includes("timeout") ||
        lastErrorMessage.toLowerCase().includes("reach") ||
        lastErrorMessage.toLowerCase().includes("protocol") ||
        lastErrorMessage.toLowerCase().includes("cannot find") ||
        lastErrorMessage.toLowerCase().includes("empty");

      const title = isConnectionError ? "Failed to Connect to Website" : "Crawl Blocked by Bot Protection";
      const scraperHint = process.env.SCRAPER_API_KEY ? "" : " Enable ScraperAPI (SCRAPER_API_KEY env var) for proxy bypass.";
      const description = isConnectionError 
        ? `The page at ${url} could not be reached. Connection status details: ${lastErrorMessage}. Please verify that the URL is spelled correctly, the website is online, and it is accessible from the public internet.`
        : `The content for ${url} could not be retrieved. This website is actively using anti-bot protection (like Cloudflare, Datadome, or a WAF) which blocked or challenged our automated crawler. Because we could not bypass the challenge, the crawl stopped here with a score of 0.${scraperHint}`;
      
      const category = "technical";
      const issueMsg = isConnectionError 
        ? `Network Connection Error: ${lastErrorMessage}. Verify the domain is valid and live.`
        : `Website strictly blocks automated bots. Please try testing a different URL that allows standard bots.${scraperHint}`;

      pageBuffer.push({
          url,
          title,
          description,
          statusCode: isConnectionError ? 504 : 403,
          issues: [
            {
              type: "critical",
              message: issueMsg,
              category,
            },
          ],
          links: { internal: [], external: [] },
          loadTime: pageLoadTime,
          score: 0,
          keywords: [],
          images: [],
          headers: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
          ogTags: {},
          structuredData: [],
          canonical: "",
          robots: "",
          wordCount: 0,
          textToCodeRatio: 0,
          performance: { performanceScore: 0, fcp: 0, lcp: 0, cls: 0, tbt: 0 },
          imageMetrics: {
            total: 0,
            missingAlt: 1,
            missingAltPercent: 100,
            genericAlt: 0,
          },
        } as any);
    }
  }

  const runWorker = async () => {
    const idleDelay = quick ? 20 : 200;
    const loopDelay = quick ? 10 : 100;
    while (startedCount < maxPages) {
      const task = queue.shift();
      if (!task) {
        if (activeWorkers === 0 && queue.length === 0) {
          await closeBrowserIfIdle();
          await new Promise((r) => setTimeout(r, idleDelay));
          if (queue.length === 0 && activeWorkers === 0) break;
          continue;
        }
        await closeBrowserIfIdle();
        await new Promise((r) => setTimeout(r, loopDelay));
        continue;
      }

      startedCount++;
      activeWorkers++;
      try {
        await getPageData(task.url, task.currentDepth);
      } catch (err) {
        console.error("Worker process error:", err);
      } finally {
        activeWorkers--;
      }
    }
  };

  try {
    const workerCount = isRender ? (quick ? 12 : 8) : (quick ? 40 : 20);
    const workers = Array.from({ length: workerCount }, () => runWorker());
    await Promise.race([
      Promise.all(workers),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Audit exceeded 10 minute timeout")), 600000))
    ]);
  } catch (error) {
    console.error("Audit error:", error);
  } finally {
    await flushPages();

    // Mark completed immediately so results are available
    if (browser) await browser.close().catch(() => {});
    if (sharedContext) await sharedContext.close().catch(() => {});
    await db.updateStatus(userId, false, 100, "Completed");
    await db.clearCrawlState(userId);
    await db.markCached(userId, startUrl);
    try {
      const pages = await db.getPages(userId);
      const stats = await db.getStats(userId);
      await db.saveAuditHistory(userId, startUrl, stats, pages.length);
    } catch (e) { console.error("Failed to save audit history:", e); }

    // Link health check — run async, don't block completion
    (async () => {
      try {
        const pages = await db.getPages(userId);
        const linkToPages = new Map<string, Set<string>>();
        for (const page of pages) {
          for (const link of (page.links?.internal || [])) {
            if (!linkToPages.has(link)) linkToPages.set(link, new Set());
            linkToPages.get(link)!.add(page.url);
          }
        }
        const uniqueLinks = [...linkToPages.keys()];
        const brokenLinks: string[] = [];
        const concurrency = isRender ? 3 : 15;
        const linkCheckTimeout = isRender ? 1500 : 2000;
        const linksToCheck = isRender ? uniqueLinks.slice(0, 500) : uniqueLinks;
        for (let i = 0; i < linksToCheck.length; i += concurrency) {
          const batch = linksToCheck.slice(i, i + concurrency);
          const results = await Promise.allSettled(
            batch.map(async (url) => {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), linkCheckTimeout);
              try {
                const res = await fetch(url, { method: "HEAD", signal: controller.signal, headers: headerSets[0] });
                if (res.status >= 400) throw new Error(`${res.status}`);
              } finally { clearTimeout(timer); }
            })
          );
          results.forEach((r, idx) => {
            if (r.status === "rejected") brokenLinks.push(batch[idx]);
          });
        }
        if (brokenLinks.length > 0) {
          for (const page of pages) {
            const brokenOnPage = (page.links?.internal || []).filter((l: string) => brokenLinks.includes(l));
            if (brokenOnPage.length > 0) {
              (page.issues || []).push({
                type: "warning",
                message: `${brokenOnPage.length} broken internal link(s) detected: ${brokenOnPage.slice(0, 3).join(", ")}${brokenOnPage.length > 3 ? ` +${brokenOnPage.length - 3} more` : ""}`,
                category: "technical",
              });
            }
          }
          await db.savePagesBatch(userId, pages);
        }
      } catch (e) { console.error("Link health check failed:", e); }
    })();
  }
}
