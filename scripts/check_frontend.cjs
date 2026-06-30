const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  console.log('Navigating to https://websporthub01.vercel.app...');
  try {
    await page.goto('https://websporthub01.vercel.app', { waitUntil: 'networkidle0' });
    console.log('Page loaded successfully.');
  } catch (err) {
    console.error('Failed to load page:', err);
  }

  await browser.close();
})();
