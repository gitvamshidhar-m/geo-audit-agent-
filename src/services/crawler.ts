import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch";
import { analyzeHTML, quickAnalyzeHTML } from "./analyzer.js";

import * as db from "./storage.js";
chromium.use(StealthPlugin());

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
];

const fetchHeaders = {
  "User-Agent": userAgents[0],
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

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
    db.updateStatus(userId, true, 0, startUrlNormalized, hasRobots, hasSitemap).catch(() => {});
  })();

  // Don't await sitemapPromise — crawl starts immediately

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
    if (browser && browserLastUsed > 0 && Date.now() - browserLastUsed > 15000 && activePlaywrights === 0) {
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

    try {
      // Try fetch first (Fast) with AbortController timeout
      try {
        const fetchStart = Date.now();
        const ac3 = new AbortController();
        const t3 = setTimeout(() => ac3.abort(), quick ? 8000 : 7000);
        const response = await fetch(url, {
          headers: fetchHeaders,
          signal: ac3.signal,
          redirect: "follow",
        });
        clearTimeout(t3);
        pageLoadTime = Date.now() - fetchStart;

        if (response.status) {
          finalUrl = response.url;
          const text = await response.text();

          const lower = text.toLowerCase();
          const looksLikeABlock = !quick && (
            text.length < 5000 &&
            (lower.includes("security check") ||
              lower.includes("cloudflare") ||
              (lower.includes("captcha") && text.length < 2000))
          );

          if (quick || (text.length > 50 && !looksLikeABlock)) {
            htmlContent = text;
            headersMap["x-actual-status"] = response.status.toString();
            response.headers.forEach((v, k) => {
              headersMap[k] = v;
            });

            const finalUrlKey = finalUrl.replace(/\/$/, "").toLowerCase();
            visited.add(finalUrlKey);
            visited.add(finalUrlKey.replace(/^https?:\/\/(www\.)?/, ""));
            const originalUrlKey = url.replace(/\/$/, "").toLowerCase();
            visited.add(originalUrlKey);
          } else if (looksLikeABlock) {
            lastErrorMessage = "Fetch returned Cloudflare or Bot Challenge block page";
          }
        }
      } catch (e: any) {
        lastErrorMessage = e.message || "Fetch failed";
      }

      // Fallback to Playwright if fetch failed or returned invalid content
      const urlKey = url
        .replace(/\/$/, "")
        .replace(/^https?:\/\/(www\.)?/, "")
        .toLowerCase();
      const startKey = startUrlNormalized
        .replace(/\/$/, "")
        .replace(/^https?:\/\/(www\.)?/, "")
        .toLowerCase();
      const isRoot = urlKey === startKey;
      
      const isLikelySPA = !htmlContent || (htmlContent.length < 800 && htmlContent.toLowerCase().includes('<script'));

      if (!htmlContent || isLikelySPA) {
        // In Quick mode, skip Playwright entirely - use raw fetch only
        if (quick) {
          if (!htmlContent) htmlContent = "";
        } else {
          // Wait if too many Playwright instances are running to prevent memory crashes
          while (activePlaywrights >= (quick ? 20 : 12)) {
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
                  browser = await chromium.launch({
                    headless: true,
                    args: [
                      "--no-sandbox",
                      "--disable-setuid-sandbox",
                      "--disable-dev-shm-usage",
                      "--single-process",
                      "--disable-web-security",
                      "--disable-features=IsolateOrigins,site-per-process",
                      "--disable-blink-features=AutomationControlled",
                    ],
                  });
                } catch (launchErr: any) {
                  console.error(
                    "Playwright failed to launch. Attempting automated recovery...",
                    launchErr.message,
                  );
                  try {
                    const { execSync } = await import("child_process");
                    execSync("npx playwright install chromium", { stdio: "inherit", timeout: 120000 });
                    browser = await chromium.launch({
                      headless: true,
                      args: [
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--single-process",
                        "--disable-web-security",
                        "--disable-features=IsolateOrigins,site-per-process",
                        "--disable-blink-features=AutomationControlled",
                      ],
                    });
                  } catch (installErr: any) {
                    console.error("Chromium install failed:", installErr.message);
                  }
                } finally {
                  isLaunchingBrowser = false;
                }
              }
            }

            if (browser) {
              if (!sharedContext) {
                sharedContext = await browser.newContext({
                  userAgent:
                    userAgents[Math.floor(Math.random() * userAgents.length)],
                  viewport: { width: 1280, height: 800 },
                  extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
                  bypassCSP: true,
                  ignoreHTTPSErrors: true,
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
                  db.updateStatus(
                    userId,
                    true,
                    progress,
                    `Bypassing Cloudflare Challenge: ${url}`,
                  ).catch(() => {});
                  if (!quick) {
                    await page.waitForTimeout(3000);
                    await page.mouse.move(Math.random() * 500, Math.random() * 500).catch(() => {});
                    await page.waitForTimeout(200);
                    await page.mouse.click(Math.random() * 500, Math.random() * 500).catch(() => {});
                    await page.waitForTimeout(1000);
                  }
                } else if (isRoot) {
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
                htmlContent = await page.content();
                headersMap = (await resp?.allHeaders()) || {};
                if (resp) {
                   headersMap["x-actual-status"] = resp.status().toString();
                }
                browserLastUsed = Date.now();

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
      }
    } catch (e: any) {
      console.error(`Outer crawl logic failed for ${url}:`, e.message);
      lastErrorMessage = e.message || "Unknown crawl error";
    }

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
      const description = isConnectionError 
        ? `The page at ${url} could not be reached. Connection status details: ${lastErrorMessage}. Please verify that the URL is spelled correctly, the website is online, and it is accessible from the public internet.`
        : `The content for ${url} could not be retrieved. This website is actively using anti-bot protection (like Cloudflare, Datadome, or a WAF) which blocked or challenged our automated crawler. Because we could not bypass the challenge, the crawl stopped here with a score of 0.`;
      
      const category = "technical";
      const issueMsg = isConnectionError 
        ? `Network Connection Error: ${lastErrorMessage}. Verify the domain is valid and live.`
        : "Website strictly blocks automated bots. Please try testing a different URL that allows standard bots.";

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
    const idleDelay = quick ? 10 : 100;
    const loopDelay = quick ? 5 : 50;
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
    const workerCount = quick ? 50 : (process.env.RENDER || process.env.NODE_ENV === 'production' ? 15 : 30);
    const workers = Array.from({ length: workerCount }, () => runWorker());
    await Promise.all(workers);
  } catch (error) {
    console.error("Audit error:", error);
  } finally {
    await flushPages();

    // Link health check — check internal links for broken/404
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
      const concurrency = 25;
      for (let i = 0; i < uniqueLinks.length; i += concurrency) {
        const batch = uniqueLinks.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          batch.map(async (url) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            try {
              const res = await fetch(url, { method: "HEAD", signal: controller.signal, headers: fetchHeaders });
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
  }
}
