import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

async function testPlaywright() {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    console.log("Playwright launched successfully!");
    const page = await browser.newPage();
    await page.goto("https://example.com");
    console.log("Content:", await page.title());
    await browser.close();
  } catch (e) {
    console.error("Playwright error:", e);
  }
}
testPlaywright();
