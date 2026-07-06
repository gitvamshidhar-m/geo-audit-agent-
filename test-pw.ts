import { chromium } from 'playwright';

async function test() {
  console.log('Attempting to launch browser...');
  try {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    console.log('Browser launched successfully!');
    const page = await browser.newPage();
    await page.goto('https://autozilla.co', { waitUntil: 'networkidle' });
    console.log('Page loaded:', await page.title());
    const content = await page.content();
    console.log('Content length:', content.length);
    console.log('Snippet:', content.substring(0, 1000));
    await browser.close();
  } catch (err) {
    console.error('Launch failed:', err);
  }
}

test();
