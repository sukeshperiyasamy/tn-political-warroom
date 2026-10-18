const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/sukes/.gemini/antigravity-cli/brain/9479771e-ad75-4d72-84be-8517ca09ff3e/screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.describe('Visual and Functional Verification Suite', () => {

  test('Workflow 1, 2, 3: Dashboard, Filters, Tamil & English Search, Empty State', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Dashboard loads with usable data
    await expect(page.getByRole('heading', { name: /TN 2026 Assembly War Room Intelligence/i })).toBeVisible();
    await expect(page.getByText('Articles Monitored')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_dashboard_desktop.png'), fullPage: false });

    // 2. Tamil search
    const searchInput = page.locator('input[aria-label="Search articles"]');
    await searchInput.fill('ஸ்டாலின்');
    await page.waitForTimeout(300);
    const stalinCards = page.locator('article');
    await expect(stalinCards.first()).toContainText('ஸ்டாலின்');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_search_tamil.png') });

    // English search
    await searchInput.fill('Vijay');
    await page.waitForTimeout(300);
    const vijayCards = page.locator('article');
    await expect(vijayCards.first()).toContainText('Vijay');

    // Empty state verification
    await searchInput.fill('xyznotfoundquery999');
    await page.waitForTimeout(300);
    // Switch to news tab if needed or check empty message
    const newsTab = page.getByRole('tab', { name: /News Intelligence/i });
    await newsTab.click();
    await expect(page.getByText('No articles match your filter criteria')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_empty_state.png') });

    // Reset filters
    const resetBtn = page.getByRole('button', { name: /Reset All Filters/i });
    await resetBtn.click();
    // Party filter: DMK
    const partySelect = page.locator('#party-filter');
    await partySelect.selectOption('DMK');
    await page.waitForTimeout(200);
    await expect(page.locator('article').first()).toContainText('DMK');

    // Reset party
    await partySelect.selectOption('');
    await page.waitForTimeout(200);

    // Topic filter: 2026 Assembly Election
    const topicSelect = page.locator('#topic-filter');
    await topicSelect.selectOption('2026 Assembly Election');
    await page.waitForTimeout(200);
    await expect(page.locator('article').first()).toBeVisible();

    // Reset filters from FilterBar
    const barResetBtn = page.getByRole('button', { name: /Reset.*filter/i });
    if (await barResetBtn.isVisible()) {
      await barResetBtn.click();
    }
    await expect(topicSelect).toHaveValue('');
  });

  test('Workflow 4, 5, 6, 7: Article Intelligence Drawer, Dual Summaries, 3 Tamil Variations, Hand-off', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 4. Open Article Intelligence Drawer
    const firstArticle = page.locator('article').first();
    await firstArticle.getByRole('button', { name: /AI Insights/i }).click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // 5. English and Tamil summaries display correctly
    await expect(drawer.getByText(/Tamil Executive Summary/i)).toBeVisible();
    await expect(drawer.getByText(/English Strategic Intelligence/i)).toBeVisible();

    // 6. 3 Tamil variations can be selected
    await expect(drawer.getByText('3 AI Tamil Headline & Hook Variations')).toBeVisible();
    
    // Check variation 1
    const varButtons = drawer.locator('button').filter({ hasText: /செய்தி|அரசியல்|வார்/ });
    await expect(varButtons).toHaveCount(3);
    
    // Click variation 2 (Political Impact)
    await varButtons.nth(1).click();
    await page.waitForTimeout(200);

    // Click variation 3 (Viral Byte)
    await varButtons.nth(2).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_intelligence_drawer_variations.png') });

    // 7. Hand-off into News Card Studio
    const proceedBtn = drawer.getByRole('button', { name: /Proceed to News Card Studio/i });
    await proceedBtn.click();

    // Verify redirected to News Card Studio
    await expect(drawer).not.toBeVisible();
    await expect(page.getByText('Tamil News Card Studio (1080×1080 Social Export)')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_news_card_studio_handoff.png') });
  });

  test('Workflow 8, 9: Card Templates, Editing Controls, 1080x1080 PNG Export', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const studioTab = page.getByRole('tab', { name: /News Card Studio/i });
    await studioTab.click({ force: true });

    // 8. Card Templates & Controls
    await expect(page.locator('#tamil-news-card-canvas')).toBeVisible();

    // Switch to Dravidian Horizon template
    const dmkTemplateBtn = page.getByRole('button', { name: /Dravidian Horizon/i });
    await dmkTemplateBtn.click();

    // Switch to Puratchi Green template
    const aiadmkTemplateBtn = page.getByRole('button', { name: /Puratchi Green/i });
    await aiadmkTemplateBtn.click();

    // Switch to Vettri Gold template
    const tvkTemplateBtn = page.getByRole('button', { name: /Vettri Gold/i });
    await tvkTemplateBtn.click();

    // Select preset
    const presetBtn = page.getByRole('button', { name: 'தவெக விஜய் மாநாடு' });
    await presetBtn.click();

    // Adjust font size slider
    const slider = page.locator('input[type="range"]');
    await slider.fill('48');

    // Toggle alignment
    const centerAlignBtn = page.getByRole('button', { name: 'Center' });
    await centerAlignBtn.click();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_news_card_customized.png') });

    // 9. Export PNG
    const exportBtn = page.locator('#export-png-btn');
    await exportBtn.dispatchEvent('click');

    await expect(page.getByText(/Successfully exported.*PNG/i)).toBeVisible({ timeout: 10000 });
  });

  test('Workflow 10: Comparison Matrix and Mobile Responsiveness', async ({ page }) => {
    // Desktop Comparison Matrix at 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const comparisonTab = page.getByRole('tab', { name: /Party Comparison/i });
    await comparisonTab.click();

    await expect(page.getByText('Comparative Political Intelligence')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dravida Munnetra Kazhagam', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_party_comparison_desktop.png') });

    // Mobile Viewport: 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Verify mobile header and navigation bar
    await expect(page.getByRole('banner').getByText('TN Political War Room', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Card Studio/i }).first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_dashboard_mobile.png') });

    // Navigate to News tab on mobile
    await page.getByRole('button', { name: /News \(\d+\)/i }).click();
    await expect(page.locator('article').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_news_feed_mobile.png') });
  });

  test('Workflow 11: Multi-Viewport Inspection (1920x1080, 1440x900, 1366x768, 390x844)', async ({ page }) => {
    // 1. 1920 x 1080 (FHD / Wide Desktop)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.getByText('Articles Monitored')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_viewport_1920x1080.png') });

    // 1b. 1920 x 1080 News Intelligence Feed Tab
    const newsTab = page.getByRole('tab', { name: /News Intelligence/i });
    await newsTab.click();
    await expect(page.locator('article').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_news_feed_1920x1080.png') });

    // 2. 1440 x 900 (Standard Desktop / Laptop)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByText('Articles Monitored')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_viewport_1440x900.png') });

    // 3. 1366 x 768 (Compact Laptop)
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await expect(page.getByText('Articles Monitored')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_viewport_1366x768.png') });

    // 4. 390 x 844 (Mobile Viewport)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('banner').getByText('TN Political War Room', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_viewport_390x844.png') });
  });

});
