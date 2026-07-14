import { chromium } from "playwright-extra";
import type { Browser, BrowserContext, Page } from "playwright-core";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const stealth = StealthPlugin();
stealth.enabledEvasions.delete('iframe.contentWindow');
chromium.use(stealth);

const isRender = !!(process.env.RENDER || process.env.NODE_ENV === 'production');

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 1680, height: 1050 },
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
];

const PLATFORMS = ["Win32", "MacIntel", "Linux x86_64"];
const LANGUAGES = [["en-US", "en"], ["en-GB", "en"], ["en-US", "en", "es"]];
const TIMEZONES = ["America/New_York", "Europe/London", "Asia/Tokyo", "America/Chicago", "America/Los_Angeles"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

let sharedBrowser: Browser | null = null;
let browserInUse = 0;
let browserTimer: ReturnType<typeof setTimeout> | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser) {
    browserInUse++;
    if (browserTimer) { clearTimeout(browserTimer); browserTimer = null; }
    return sharedBrowser;
  }
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--single-process",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-blink-features=AutomationControlled",
    "--disable-font-security",
    "--disable-rtc-smoothing",
    "--disable-webrtc",
    "--disable-webrtc-hw-encoding",
    "--disable-webrtc-hw-decoding",
    ...(isRender ? [
      "--disable-gpu",
      "--disable-gpu-compositing",
      "--disable-software-rasterizer",
      "--no-zygote",
      "--memory-pressure-off",
      "--js-flags=--max-old-space-size=128",
    ] : []),
  ];
  const browser = await chromium.launch({ headless: true, args });
  sharedBrowser = browser;
  browserInUse = 1;
  return browser;
}

function releaseBrowser() {
  browserInUse = Math.max(0, browserInUse - 1);
  if (browserInUse === 0 && sharedBrowser) {
    browserTimer = setTimeout(async () => {
      try { await sharedBrowser?.close().catch(() => {}); } catch {}
      sharedBrowser = null;
      browserTimer = null;
    }, isRender ? 8000 : 15000);
  }
}

async function launchFreshBrowser(): Promise<Browser> {
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--single-process",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-blink-features=AutomationControlled",
    "--disable-font-security",
    "--disable-rtc-smoothing",
    "--disable-webrtc",
    "--disable-webrtc-hw-encoding",
    "--disable-webrtc-hw-decoding",
    ...(isRender ? [
      "--disable-gpu",
      "--disable-gpu-compositing",
      "--disable-software-rasterizer",
      "--no-zygote",
      "--memory-pressure-off",
      "--js-flags=--max-old-space-size=128",
    ] : []),
  ];
  const browser = await chromium.launch({ headless: true, args });
  return browser;
}

export async function closeBrowser() {
  if (browserTimer) { clearTimeout(browserTimer); browserTimer = null; }
  if (sharedBrowser) {
    try { await sharedBrowser.close().catch(() => {}); } catch {}
    sharedBrowser = null;
  }
}

function getStealthInitScript(viewport: { width: number; height: number }, platform: string, userAgent: string) {
  const languages = randomItem(LANGUAGES);
  const timezone = randomItem(TIMEZONES);
  return `
{
  const w = window;
  const d = document;

  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ${JSON.stringify(languages)} });
  Object.defineProperty(navigator, 'platform', { get: () => '${platform}' });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${4 + Math.floor(Math.random() * 8)} });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => ${[4, 8, 8, 16][Math.floor(Math.random() * 4)]} });
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => ${Math.random() > 0.7 ? 5 : 0} });

  w.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };

  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imgData.data.length; i += 50 + Math.floor(Math.random() * 50)) {
        imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + (Math.random() > 0.5 ? 1 : -1)));
      }
      ctx.putImageData(imgData, 0, 0);
    }
    return origToDataURL.call(this, type);
  };

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {
    const ctx = origGetContext.call(this, type, attrs);
    if (ctx && type === 'webgl' || type === 'webgl2') {
      const origGetParameter = ctx.getParameter;
      ctx.getParameter = function(p) {
        const r = origGetParameter.call(this, p);
        if (p === 37445) return 'Intel Inc.';
        if (p === 37446) return 'Intel Iris OpenGL Engine';
        if (p === 7936) return \`WebKit WebGL (${viewport.width}x${viewport.height})\`;
        if (p === 35724) return Math.random() > 0.5 ? 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11)' : 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)';
        return r;
      };
    }
    return ctx;
  };

  if (w.CSS) {
    const origSupports = CSS.supports;
    CSS.supports = function(prop, val) {
      return origSupports.call(this, prop, val);
    };
  }

  Object.defineProperty(w, 'outerWidth', { get: () => ${viewport.width} });
  Object.defineProperty(w, 'outerHeight', { get: () => ${viewport.height + 80 + Math.floor(Math.random() * 40)} });

  Object.defineProperty(screen, 'width', { get: () => ${viewport.width} });
  Object.defineProperty(screen, 'height', { get: () => ${viewport.height} });
  Object.defineProperty(screen, 'availWidth', { get: () => ${viewport.width} });
  Object.defineProperty(screen, 'availHeight', { get: () => ${viewport.height - 40} });
  Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
  Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
}
`;
}

async function simulateHumanBehavior(page: Page) {
  for (let i = 0; i < 4 + Math.floor(Math.random() * 5); i++) {
    await page.mouse.move(
      100 + Math.random() * (page.viewportSize()?.width || 800) - 100,
      100 + Math.random() * (page.viewportSize()?.height || 600) - 100,
      { steps: 8 + Math.floor(Math.random() * 12) }
    ).catch(() => {});
    await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
  }
  await page.evaluate(() => window.scrollTo(0, Math.random() * 400)).catch(() => {});
  await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
}

async function detectCloudflare(page: Page): Promise<boolean> {
  const title = await page.title().catch(() => "");
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 1000) || "").catch(() => "");
  const html = await page.content().catch(() => "");

  const signals = [
    title.toLowerCase().includes("just a moment"),
    title.toLowerCase().includes("cloudflare"),
    title.toLowerCase().includes("attention required"),
    bodyText.toLowerCase().includes("checking your browser"),
    bodyText.toLowerCase().includes("verifying you are human"),
    bodyText.toLowerCase().includes("enable javascript"),
    bodyText.toLowerCase().includes("please wait"),
    bodyText.toLowerCase().includes("your browser"),
    html.includes("cf-browser-verification"),
    html.includes("__cf_chl_f_tk"),
    html.includes("cf_chl_opt"),
    html.includes("_cf_chl_opt"),
    html.includes("challenge-platform"),
    html.includes("turnstile"),
    html.includes("cf-turnstile"),
  ];
  return signals.some(Boolean);
}

async function bypassCloudflare(page: Page, url: string): Promise<boolean> {
  const cookieCheck = () => document.cookie.includes('cf-clearance');

  for (let stage = 0; stage < 3; stage++) {
    const resolved = await Promise.race([
      page.waitForFunction(cookieCheck, { timeout: stage === 0 ? 25000 : stage === 1 ? 15000 : 10000 })
        .then(() => true).catch(() => false),
      new Promise<boolean>(r => setTimeout(() => r(false), stage === 0 ? 25000 : stage === 1 ? 15000 : 10000))
    ]);
    if (resolved) {
      await page.waitForTimeout(1000);
      return true;
    }

    if (stage === 0) {
      for (let i = 0; i < 6; i++) {
        await page.mouse.move(
          100 + Math.random() * 700,
          100 + Math.random() * 500,
          { steps: 10 + Math.floor(Math.random() * 15) }
        ).catch(() => {});
        await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
      }
      await page.mouse.click(300 + Math.random() * 200, 300 + Math.random() * 200).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
      await page.keyboard.press('PageDown').catch(() => {});
      await new Promise(r => setTimeout(r, 800));
      await page.keyboard.press('PageDown').catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      await page.keyboard.press('PageUp').catch(() => {});
      await new Promise(r => setTimeout(r, 500));
    } else if (stage === 1) {
      await page.reload({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return false;
}

export interface PlaywrightResult {
  html: string;
  finalUrl: string;
  headers: Record<string, string>;
  loadTime: number;
  success: boolean;
  cookies?: string;
}

export async function fetchWithPlaywright(
  url: string,
  existingCookies?: string,
  quick = false,
  proxy?: { server: string; username?: string; password?: string },
  freshBrowser = false
): Promise<PlaywrightResult> {
  const viewport = randomItem(VIEWPORTS);
  const userAgent = randomItem(USER_AGENTS);
  const platform = randomItem(PLATFORMS);

  const browser = freshBrowser ? await launchFreshBrowser() : await getBrowser();
  const ctxOpts: any = {
    userAgent,
    viewport,
    locale: randomItem(LANGUAGES)[0],
    timezoneId: randomItem(TIMEZONES),
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9", "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    bypassCSP: true,
    ignoreHTTPSErrors: true,
  };
  if (proxy) ctxOpts.proxy = proxy;
  const context = await browser.newContext(ctxOpts);

  try {
    await context.addInitScript(getStealthInitScript(viewport, platform, userAgent));

    if (existingCookies) {
      const domain = new URL(url).hostname;
      await context.addCookies(existingCookies.split('; ').map(c => {
        const [n, ...rest] = c.split('=');
        return { name: n, value: rest.join('='), domain: '.' + domain, path: '/' };
      }));
    }

    const page = await context.newPage();

    // Block only heavy trackers (NOT CSS or fonts — Cloudflare needs them)
    await page.route('**/*', (route) => {
      const urlStr = route.request().url().toLowerCase();
      if (urlStr.includes('analytics') || urlStr.includes('gtm.js') ||
          urlStr.includes('facebook') || urlStr.includes('hotjar') ||
          urlStr.includes('doubleclick') || urlStr.includes('google-analytics')) {
        return route.abort();
      }
      return route.continue();
    });

    const start = Date.now();
    let resp = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: quick ? 8000 : 30000,
    }).catch((err: any) => {
      console.error(`Playwright goto failed for ${url}:`, err.message);
      return null;
    });
    const loadTime = Date.now() - start;

    const blocked = await detectCloudflare(page);
    let cfBypassed = false;

    if (blocked) {
      console.log(`Cloudflare detected for ${url}, attempting bypass...`);
      cfBypassed = await bypassCloudflare(page, url);
      if (cfBypassed) {
        console.log(`Cloudflare bypassed for ${url}`);
      } else {
        console.log(`Cloudflare NOT bypassed for ${url} after all stages`);
      }
    }

    const html = await page.content().catch(() => "");
    const finalUrl = page.url();

    const headers: Record<string, string> = {};
    if (resp) {
      headers["x-actual-status"] = resp.status().toString();
      const allHeaders = await resp.allHeaders().catch(() => ({}));
      Object.assign(headers, allHeaders);
    }
    headers["x-via"] = "playwright";
    headers["x-cf-bypassed"] = cfBypassed ? "true" : (blocked ? "failed" : "none");

    const cookies = await context.cookies().catch(() => []);
    const cfClearance = cookies.find(c => c.name === 'cf-clearance');
    if (cfClearance) {
      headers["x-cf-clearance"] = cfClearance.value;
    }
    const cookiesStr = cookies.filter(c => !c.name.startsWith('__')).map(c => `${c.name}=${c.value}`).join('; ');

    return { html, finalUrl, headers, loadTime, success: html.length > 100, cookies: cookiesStr || undefined };
  } finally {
    await context.close().catch(() => {});
    if (freshBrowser) {
      try { await browser.close().catch(() => {}); } catch {}
    } else {
      releaseBrowser();
    }
  }
}
