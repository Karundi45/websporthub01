const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
    }
  });
  page.on('pageerror', error => console.log('UNCAUGHT PAGE ERROR:', error.message));

  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully. Attempting to sign up...');
    
    // Switch to Sign Up
    await page.click('button:has-text("Sign Up")');
    
    // Fill in sign up details
    const randomEmail = `test_${Date.now()}@test.com`;
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', 'password123');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    console.log('Clicked signup. Waiting for 3 seconds...');
    await page.waitForTimeout(3000);
    
    console.log('Checking for login UI...');
    // Maybe we need to verify email or we get auto-logged in?
    // Supabase auth auto-login depends on confirm email settings.
    console.log('Done waiting. Checking if there are any errors above.');
  } catch (err) {
    console.error('Script failed:', err);
  }

  await browser.close();
})();
