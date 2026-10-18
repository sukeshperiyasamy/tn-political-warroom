const { test, expect } = require('@playwright/test');

test('smoke test - verify environment and browser navigation', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example Domain/);
});
