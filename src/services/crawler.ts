import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fetch from "node-fetch";
import pLimit from "p-limit";
import { analyzeHTML } from "./analyzer.js";

import * as db from "./storage.js";
// Use stealth plugin for Playwright
chromium.use(StealthPlugin());

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
];

interface AuditConfig {
  depth: number;
  maxPages: number;
  userId?: string;
}

export async function audit(startUrl: string, config: AuditConfig) {
  const { depth, maxPages, userId = "public" } = config;
  const visited = new Set<string>();

  let startUrlNormalized = startUrl.trim().replace(/\/$/, "").toLowerCase();
  if (
    !startUrlNormalized.startsWith("http://") &&
    !startUrlNormalized.startsWith("https://")
  ) {
    startUrlNormalized = `https://${startUrlNormalized}`;
  }

  // Ensure root is in visited
  visited.add(startUrlNormalized);
  const queue: { url: string; currentDepth: number }[] = [
    { url: startUrlNormalized, currentDepth: 0 },
  ];

  await db.resetData(userId);
  await db.updateStatus(userId, true, 0, startUrlNormalized);

  // Check robots.txt and sitemap
  let hasRobots = false;
  let hasSitemap = false;
  let sitemapUrls: string[] = [];
  try {
    const baseUrl = new URL(startUrlNormalized).origin;

    const robotsCtrl = new AbortController();
    const robotsTimer = setTimeout(() => robotsCtrl.abort(), 8000);
    const robotsRes = await fetch(`${baseUrl}/robots.txt`, {
      headers: {
        "User-Agent": userAgents[0],
        Accept: "text/plain,text/html,*/*",
      },
      signal: robotsCtrl.signal,
    }).catch(() => null);
    clearTimeout(robotsTimer);

    // If robots.txt is blocked, we'll try common sitemap locations anyway
    hasRobots = robotsRes?.ok || false;

    const fetchSitemapUrls = async (
      sUrl: string,
      depth = 0,
    ): Promise<string[]> => {
      if (depth > 3) return []; // Increased depth for massive sites
      try {
        const sController = new AbortController();
        const sTimeout = setTimeout(() => sController.abort(), 10000);
        const sRes = await fetch(sUrl, {
          headers: {
            "User-Agent":
              userAgents[Math.floor(Math.random() * userAgents.length)],
            Accept: "application/xml,text/xml,*/*",
          },
          signal: sController.signal,
        }).catch(() => null);
        clearTimeout(sTimeout);

        if (sRes?.ok) {
          const sText = await sRes.text();
          // Improved loc regex to handle namespaces
          const locs = sText.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g);
          if (locs) {
            const extracted = locs.map((u) =>
              u.replace(/<\/?loc>/g, "").trim(),
            );
            let all = [] as string[];
            for (const loc of extracted) {
              if (loc.endsWith(".xml") || loc.includes("sitemap")) {
                const sub = await fetchSitemapUrls(loc, depth + 1);
                all = all.concat(sub);
              } else {
                all.push(loc);
              }
            }
            return all;
          }
        }
      } catch (e) {}
      return [];
    };

    if (hasRobots && robotsRes) {
      const robotsText = await robotsRes.text();
      const sitemapMatches = robotsText.match(
        /Sitemap:\s*(https?:\/\/[^\s]+)/gi,
      );
      if (sitemapMatches) {
        for (const m of sitemapMatches) {
          const sUrl = m.replace(/Sitemap:\s*/i, "").trim();
          const urls = await fetchSitemapUrls(sUrl);
          sitemapUrls = sitemapUrls.concat(urls);
          if (urls.length > 0) hasSitemap = true;
        }
      }
    }

    // Always try common locations in parallel
    const commonSitemaps = [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/sitemap-index.xml",
      "/sitemaps/sitemap.xml",
    ];

    await Promise.all(commonSitemaps.map(async (path) => {
      if (sitemapUrls.length > 1000) return;
      const urls = await fetchSitemapUrls(`${baseUrl}${path}`);
      if (urls.length > 0) {
        sitemapUrls = sitemapUrls.concat(urls);
        hasSitemap = true;
      }
    }));

    // Add sitemap URLs to queue if they match the domain
    const startHost = new URL(startUrlNormalized).hostname.replace(
      /^www\./,
      "",
    );
    sitemapUrls.forEach((sUrl) => {
      try {
        const sHost = new URL(sUrl).hostname.replace(/^www\./, "");
        if (sHost === startHost) {
          const sKey = sUrl.trim().replace(/\/$/, "").toLowerCase();
          const sNoWww = sKey.replace(/^https?:\/\/(www\.)?/, "");
          if (!visited.has(sKey) && !visited.has(sNoWww)) {
            visited.add(sKey);
            visited.add(sNoWww);
            queue.push({ url: sUrl, currentDepth: 1 });
          }
        }
      } catch (e) {}
    });
  } catch (e) {
    console.error("Meta checks failed", e);
  }
  await db.updateStatus(userId, true, 0, startUrlNormalized, hasRobots, hasSitemap);

  let processedCount = 0;
  let startedCount = 0;
  let activeWorkers = 0;
  let activePlaywrights = 0;
  let browser: any = null;
  let isLaunchingBrowser = false;

  async function getPageData(url: string, currentDepth: number) {
    if (processedCount >= maxPages) return;

    const startTime = Date.now();
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

    try {
      // Try fetch first (Fast)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Ch-Ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": "\"Windows\"",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1"
          },
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);

        if (response.status) {
          finalUrl = response.url;
          const text = await response.text();

          const lower = text.toLowerCase();
          // Relaxed validation: If it's got a reasonable amount of content, it's likely not a block
          const looksLikeABlock =
            text.length < 5000 &&
            (lower.includes("security check") ||
              lower.includes("cloudflare") ||
              (lower.includes("captcha") && text.length < 2000));

          if (text.length > 50 && !looksLikeABlock) {
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
      
      const isLikelySPA = htmlContent && htmlContent.length < 3000 && htmlContent.toLowerCase().includes('<script');

      if (!htmlContent || isLikelySPA) {
        // Wait if too many Playwright instances are running to prevent memory crashes
        while (activePlaywrights >= 8) {
           await new Promise((r) => setTimeout(r, 100));
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
                } finally {
                  isLaunchingBrowser = false;
                }
              }
            }

            if (browser) {
              const context = await browser.newContext({
                userAgent:
                  userAgents[Math.floor(Math.random() * userAgents.length)],
                viewport: { width: 1280, height: 800 },
                extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
                bypassCSP: true,
                ignoreHTTPSErrors: true,
              });

              const page = await context.newPage();

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
                let resp = await page
                  .goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })
                  .catch((err) => {
                    lastErrorMessage = err.message || "Playwright goto failed";
                    return null;
                  });
                
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
                  await page.waitForTimeout(5000);
                  await page.mouse
                    .move(Math.random() * 500, Math.random() * 500)
                    .catch(() => {});
                  await page.waitForTimeout(500);
                  await page.mouse
                    .click(Math.random() * 500, Math.random() * 500)
                    .catch(() => {});
                  await page.waitForTimeout(2000);
                } else if (isRoot) {
                  // Only add landing warmup/scroll for the root page
                  await page.waitForTimeout(1000);
                  await page
                    .evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
                    .catch(() => {});
                  await page.waitForTimeout(500);
                  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
                } else {
                  // Let SPAs render links on deeper pages too
                  await page.waitForTimeout(1000);
                }

                finalUrl = page.url();
                htmlContent = await page.content();
                headersMap = (await resp?.allHeaders()) || {};
                if (resp) {
                   headersMap["x-actual-status"] = resp.status().toString();
                }

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
                await context?.close().catch(() => {});
              }
            }
          } finally {
            activePlaywrights--;
          }
        }
    } catch (e: any) {
      console.error(`Outer crawl logic failed for ${url}:`, e.message);
      lastErrorMessage = e.message || "Unknown crawl error";
    }

    // ALWAYS increment and save result (success or failure) to avoid UI getting stuck
    processedCount++;

    if (htmlContent && htmlContent.length > 50) {
      const loadTime = Date.now() - startTime;
      const pageData = analyzeHTML(finalUrl, htmlContent, loadTime, headersMap);

      await db.savePage(userId, pageData);

      if (currentDepth < depth) {
        pageData.links.internal.forEach((link) => {
          const linkKey = link.trim().replace(/\/$/, "").toLowerCase();
          const linkNoWww = linkKey.replace(/^https?:\/\/(www\.)?/, "");

          if (
            !visited.has(linkKey) &&
            !visited.has(linkNoWww) &&
            processedCount + queue.length < maxPages * 10
          ) {
            visited.add(linkKey);
            visited.add(linkNoWww);
            queue.push({ url: link, currentDepth: currentDepth + 1 });
          }
        });
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

      try {
        await db.savePage(userId, {
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
          loadTime: Date.now() - startTime,
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
      } catch (saveErr: any) {
        console.error(`Failed to save fallback page for ${url}:`, saveErr.message);
      }
    }
  }

  const runWorker = async () => {
    while (startedCount < maxPages) {
      const task = queue.shift();
      if (!task) {
        // If queue is empty, wait and check if others are still working
        if (activeWorkers === 0) {
          await new Promise((r) => setTimeout(r, 1000));
          if (queue.length === 0 && activeWorkers === 0) break;
          continue;
        }
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      startedCount++;
      activeWorkers++;
      try {
        await getPageData(task.url, task.currentDepth);
        // Minimal delay to prevent freezing
        await new Promise((r) => setTimeout(r, 10));
      } catch (err) {
        console.error("Worker process error:", err);
      } finally {
        activeWorkers--;
      }
    }
  };

  try {
    const workerCount = process.env.RENDER || process.env.NODE_ENV === 'production' ? 12 : 20; // Increase concurrency heavily since most requests use fetch
    const workers = Array.from({ length: workerCount }, () => runWorker());
    await Promise.all(workers);
  } catch (error) {
    console.error("Audit error:", error);
  } finally {
    if (browser) await browser.close().catch(() => {});
    await db.updateStatus(userId, false, 100, "Completed");
  }
}
