import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture console messages
const consoleMessages = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleMessages.push('[ERROR] ' + msg.text());
  }
});

// Capture page errors
page.on('pageerror', error => {
  consoleMessages.push('[PAGE ERROR] ' + error.message);
});

try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });
  console.log('Page loaded successfully');
} catch (e) {
  console.log('Page load error: ' + e.message);
}

// Take screenshot
await page.screenshot({ path: '/Users/swufan/projects/github/taskflow/backend/frontend-screenshot.png', fullPage: true });
console.log('Screenshot saved to frontend-screenshot.png');

// Get page title
const title = await page.title();
console.log('Page title: ' + title);

// Get body text to see what's rendered
const bodyText = await page.locator('body').innerText().catch(() => 'Could not get body text');
console.log('Body text (first 500 chars): ' + bodyText.substring(0, 500));

// Check what's in the DOM
const html = await page.content();
console.log('Page HTML length: ' + html.length);

// Print console errors
if (consoleMessages.length > 0) {
  console.log('\n=== Console Errors ===');
  consoleMessages.forEach(m => console.log(m));
} else {
  console.log('\nNo console errors detected');
}

await browser.close();
