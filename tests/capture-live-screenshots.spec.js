const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test('Capture live sources and dashboard screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // 1. Live Feed Dashboard Overview
  await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Articles Monitored')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_live_dashboard.png'), fullPage: false });

  // 2. Sources & Ingestion Hub
  await page.getByRole('tab', { name: /Sources & Ingestion/i }).click();
  await expect(page.getByRole('heading', { name: /Source Management & Feed Freshness Hub/i })).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_source_registry_hub.png'), fullPage: false });

  // 3. Test Feed Inspection Modal
  const publishersTable = page.locator('table').first();
  const polimerRow = publishersTable.locator('tr').filter({ hasText: 'Polimer News' });
  await polimerRow.getByRole('button', { name: 'Test' }).click();
  await expect(page.getByText('Endpoint Inspection: Polimer News')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_feed_inspection_modal.png'), fullPage: false });
  await page.getByRole('button', { name: 'Close Inspector' }).click();

  // 4. Live News Feed with LIVE RSS Badges
  await page.getByRole('tab', { name: /News Intelligence/i }).click();
  await expect(page.locator('article').first()).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_live_news_feed.png'), fullPage: false });

  // 5. Party Comparison in Live Mode
  await page.getByRole('tab', { name: /Party Comparison/i }).click();
  await expect(page.getByText('Comparative Political Intelligence')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_live_party_comparison.png'), fullPage: false });
});
