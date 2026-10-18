const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = path.resolve('C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots');

test.describe('Political Intelligence Brief & Topic Trends Verification', () => {

  test('1. Navigates to Brief tab and renders executive synthesis, topic trends, and party matrices', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Click Brief Tab
    const briefTab = page.getByRole('tab', { name: /Intelligence Brief/i });
    await expect(briefTab).toBeVisible();
    await briefTab.click({ force: true });

    // Verify Brief View Header
    await expect(page.getByRole('heading', { name: 'Political Intelligence Brief' })).toBeVisible();
    await expect(page.getByText('v1.0 Synthesis')).toBeVisible();

    // Verify Telemetry Reporting Window
    await expect(page.getByText(/Reporting Window \(IST\):/i)).toBeVisible();
    await expect(page.getByText(/Evidence Base:/i)).toBeVisible();

    // 2. Verify Key Developments & Verified Claims
    await expect(page.getByText(/Key Developments & Verified Claims/i)).toBeVisible();
    const itemBadge = page.getByText(/Item #1/i);
    await expect(itemBadge).toBeVisible();

    // 3. Verify Topic Trends Section
    await expect(page.getByText(/Topic Trends & Coverage Acceleration/i)).toBeVisible();
    await expect(page.getByText('Governance').first()).toBeVisible();

    // 4. Verify Party & Leader Coverage Section
    await expect(page.getByText(/Party & Leader Media Presence vs Editorial Sentiment/i)).toBeVisible();
    // Mandatory caveat must be visible
    await expect(page.getByText(/Data Integrity Notice:.*Coverage statistics indicate volume of news mentions/i)).toBeVisible();

    // 5. Verify Language Toggle to Tamil
    const tamilBtn = page.getByRole('button', { name: 'தமிழ்' });
    await tamilBtn.click();
    await expect(page.getByRole('heading', { name: 'முதன்மை அரசியல் சுருக்கம்' })).toBeVisible();

    // Toggle back to English
    const engBtn = page.getByRole('button', { name: 'English' });
    await engBtn.click();
    await expect(page.getByText('Executive Intelligence Brief')).toBeVisible();

    // 6. Test Period Toggle (7 Days)
    const sevenDaysBtn = page.getByRole('button', { name: /7 Days/i });
    await sevenDaysBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Evidence Base:/i)).toBeVisible();

    // Capture comprehensive screenshot of the Intelligence Brief view
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_intelligence_brief_desktop.png'), fullPage: false });
  });

  test('2. Topic Trends inspection modal opens supporting article details', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const briefTab = page.getByRole('tab', { name: /Intelligence Brief/i });
    await briefTab.click({ force: true });

    // Click "Inspect" button on the first topic card
    const inspectBtn = page.getByRole('button', { name: /Inspect/i }).first();
    if (await inspectBtn.isVisible()) {
      await inspectBtn.click();
      await expect(page.getByText(/Supporting Article Citation/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /Read Original Article/i })).toBeVisible();

      // Close modal
      const closeBtn = page.getByRole('button', { name: 'Close' });
      await closeBtn.click();
      await expect(page.getByText(/Supporting Article Citation/i)).not.toBeVisible();
    }
  });

  test('3. Search and Evidence Explorer filters articles with Tamil and English queries', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const briefTab = page.getByRole('tab', { name: /Intelligence Brief/i });
    await briefTab.click({ force: true });

    const searchInput = page.getByPlaceholder(/Search Tamil or English query/i);
    await expect(searchInput).toBeVisible();

    // Search for DMK
    await searchInput.fill('DMK');
    await page.waitForTimeout(400);
    await expect(page.getByText(/verified articles matching filter/i)).toBeVisible();

    // Clear and search Tamil query
    await searchInput.fill('ஸ்டாலின்');
    await page.waitForTimeout(400);
    await expect(page.getByText(/verified articles matching filter/i)).toBeVisible();

    // Test Party Filter dropdown
    const partySelect = page.locator('select').first();
    await partySelect.selectOption('DMK');
    await page.waitForTimeout(400);

    // Verify search results table has entries
    const tableRows = page.locator('tbody tr');
    await expect(tableRows.first()).toBeVisible();
  });

  test('4. Responsive mobile rendering of Political Intelligence Brief (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Mobile nav ribbon Brief button
    const mobileBriefBtn = page.locator('header').getByRole('button', { name: 'Brief' });
    await mobileBriefBtn.click();

    await expect(page.getByRole('heading', { name: 'Political Intelligence Brief' })).toBeVisible();
    await expect(page.getByText(/Topic Trends/i)).toBeVisible();
    await expect(page.getByText(/Party & Leader Media Presence/i)).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_intelligence_brief_mobile.png'), fullPage: false });
  });

});
