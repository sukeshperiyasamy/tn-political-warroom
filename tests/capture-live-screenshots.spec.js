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

  // 6. Intelligence Brief Desktop
  await page.getByRole('tab', { name: /Intelligence Brief/i }).click();
  await expect(page.getByRole('heading', { name: 'Political Intelligence Brief' })).toBeVisible();
  await expect(page.getByText(/Reporting Window \(IST\):/i)).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_intelligence_brief_desktop.png'), fullPage: false });

  // 7. News Card Studio Desktop
  await page.getByRole('tab', { name: /News Card Studio/i }).click();
  await expect(page.getByText('Tamil News Card Studio (1080×1080 Social Export)')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_card_studio_desktop.png'), fullPage: false });

  // 8. Article Intelligence Drawer
  await page.getByRole('tab', { name: /Dashboard Overview/i }).click();
  await expect(page.locator('article').first()).toBeVisible();
  await page.locator('article').first().getByRole('button', { name: /AI Insights/i }).click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_article_drawer.png'), fullPage: false });
  await page.keyboard.press('Escape');

  // 9. Mobile Viewport (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Articles Monitored')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_dashboard_mobile.png'), fullPage: false });

  // 10. Intelligence Brief Mobile
  await page.getByRole('button', { name: 'Brief' }).click();
  await expect(page.getByRole('heading', { name: 'Political Intelligence Brief' })).toBeVisible();
  await expect(page.getByText(/Reporting Window \(IST\):/i)).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_intelligence_brief_mobile.png'), fullPage: false });
});
