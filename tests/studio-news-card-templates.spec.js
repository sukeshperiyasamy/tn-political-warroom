// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Studio News Card Templates Verification', () => {
  test('Acceptance Criteria: 2 channel templates, no party selectors, correct Tamil script, preview & export', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Navigate to Studio tab
    const studioTab = page.locator('button[role="tab"][aria-label="News Card Studio"]:visible').first();
    await expect(studioTab).toBeVisible({ timeout: 10000 });
    await studioTab.click();

    // Switch to Graphic Studio sub-tab if currently on Editorial sub-tab
    const graphicSubTab = page.getByRole('button', { name: /Social Graphic Studio/i });
    if (await graphicSubTab.isVisible()) {
      await graphicSubTab.click();
    }

    // 2. Verify Canvas Easel is visible
    const canvas = page.locator('#tamil-news-card-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 3. Verify exactly TWO templates are selectable in the studio interface
    const newsClicksBtn = page.getByRole('button', { name: /Select NEWS CLICKS template/i });
    const trendsTamilBtn = page.getByRole('button', { name: /Select NEWS TRENDS தமிழ் template/i });

    await expect(newsClicksBtn).toBeVisible();
    await expect(trendsTamilBtn).toBeVisible();

    // 4. Verify template 1: News Clicks displays channel name and image preview
    await expect(newsClicksBtn).toContainText('NEWS CLICKS');
    const clicksImg = newsClicksBtn.locator('img');
    await expect(clicksImg).toBeVisible();
    await expect(clicksImg).toHaveAttribute('src', /news-clicks\.jpeg/);

    // 5. Verify template 2: News Trends Tamil displays "NEWS TRENDS தமிழ்" with Tamil script
    await expect(trendsTamilBtn).toContainText('NEWS TRENDS தமிழ்');
    await expect(trendsTamilBtn.locator('.font-tamil')).toContainText('தமிழ்');
    const trendsImg = trendsTamilBtn.locator('img');
    await expect(trendsImg).toBeVisible();
    await expect(trendsImg).toHaveAttribute('src', /news-trends-tamil\.jpeg/);

    // 6. Verify old template options are REMOVED from the Studio
    await expect(page.getByText('War Room Command (Dark)')).not.toBeVisible();
    await expect(page.getByText('Dravidian Horizon')).not.toBeVisible();
    await expect(page.getByText('Puratchi Green')).not.toBeVisible();
    await expect(page.getByText('Dharma Saffron')).not.toBeVisible();
    await expect(page.getByText('Vettri Gold')).not.toBeVisible();
    await expect(page.getByText('The Morning Dispatch')).not.toBeVisible();

    // 7. Verify Party Branding Badge selection is REMOVED from Studio
    await expect(page.getByText('Party Branding Badge')).not.toBeVisible();

    // 8. Test Template Selection Toggle & Preview Easel Background Update
    // Click News Trends Tamil template
    await trendsTamilBtn.click();
    await expect(trendsTamilBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(trendsTamilBtn.getByText('SELECTED')).toBeVisible();

    // Verify canvas background image updated to news-trends-tamil
    const canvasBg = canvas.locator('img').first();
    await expect(canvasBg).toHaveAttribute('src', /news-trends-tamil\.jpeg/);
    await expect(canvas).toContainText('NEWS TRENDS தமிழ்');

    // Click News Clicks template
    await newsClicksBtn.click();
    await expect(newsClicksBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(newsClicksBtn.getByText('SELECTED')).toBeVisible();
    await expect(canvasBg).toHaveAttribute('src', /news-clicks\.jpeg/);
    await expect(canvas).toContainText('NEWS CLICKS');

    // 9. Verify Headline & Supporting Text are styled with White Text inside Content Area
    const headlineElement = canvas.locator('h1');
    await expect(headlineElement).toBeVisible();
    await expect(headlineElement).toHaveClass(/text-white/);

    // 10. Verify Export PNG workflow functions
    const exportBtn = page.locator('#export-png-btn');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify download success message appears
    await expect(page.getByText(/Successfully exported.*news_card_.*as 1080×1080 PNG/i)).toBeVisible({ timeout: 10000 });
  });

  test('Mobile Responsiveness: 2 templates render cleanly on mobile viewport', async ({ page }) => {
    // Set mobile viewport (iPhone 14 / modern Android 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Open mobile menu drawer
    const menuBtn = page.getByRole('button', { name: /open navigation menu/i });
    await expect(menuBtn).toBeVisible({ timeout: 10000 });
    await menuBtn.click();

    // Drawer dialog
    const drawer = page.getByRole('dialog', { name: /mobile navigation menu/i });
    await expect(drawer).toBeVisible();

    // Navigate to Card Studio section in drawer
    const mobileStudioBtn = drawer.getByRole('button', { name: /Card Studio/i });
    await expect(mobileStudioBtn).toBeVisible();
    await mobileStudioBtn.click();

    // Switch to Graphic Studio sub-tab
    const graphicSubTab = page.getByRole('button', { name: /Social Graphic Studio/i });
    if (await graphicSubTab.isVisible()) {
      await graphicSubTab.click();
    }

    // Both template cards visible and selectable on mobile
    const newsClicksBtn = page.getByRole('button', { name: /Select NEWS CLICKS template/i });
    const trendsTamilBtn = page.getByRole('button', { name: /Select NEWS TRENDS தமிழ் template/i });
    await expect(newsClicksBtn).toBeVisible();
    await expect(trendsTamilBtn).toBeVisible();

    // Canvas easel is visible and scaled to fit mobile viewport
    const canvas = page.locator('#tamil-news-card-canvas');
    await expect(canvas).toBeVisible();

    // Verify no horizontal overflow on mobile
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });
});
