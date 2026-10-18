const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots');

test.describe('Chart Layout and Overflow Regression Tests', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  const viewports = [
    { name: 'desktop-wide', width: 1440, height: 900 },
    { name: 'desktop-laptop', width: 1280, height: 800 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`Chart layout and bounds at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Wait for dashboard to load
      await expect(page.getByText('Media Coverage Trend Over Time')).toBeVisible({ timeout: 10000 });

      // Scroll to chart
      const chartHeader = page.getByText('Media Coverage Trend Over Time');
      await chartHeader.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Verify no horizontal page scrolling on document
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      const overflowingElements = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const all = document.querySelectorAll('*');
        const bad = [];
        for (const el of all) {
          const r = el.getBoundingClientRect();
          if (r.right > docWidth + 2) {
            bad.push({
              tag: el.tagName,
              className: el.className?.toString().slice(0, 80),
              text: el.textContent?.slice(0, 40),
              right: r.right,
              width: r.width,
            });
          }
        }
        return bad.slice(0, 10);
      });
      const trendCard = page.locator('text=Media Coverage Trend Over Time').locator('xpath=ancestor::div[contains(@class, "bg-white") and contains(@class, "rounded-xl")][1]');
      const topicsCard = page.locator('text=Hot Political Topics').locator('xpath=ancestor::div[contains(@class, "bg-white") and contains(@class, "rounded-xl")][1]');

      await expect(trendCard).toBeVisible();
      await expect(topicsCard).toBeVisible();

      const trendBox = await trendCard.boundingBox();
      const topicsBox = await topicsCard.boundingBox();

      console.log(`[${vp.name}] trendBox:`, trendBox);
      console.log(`[${vp.name}] topicsBox:`, topicsBox);

      // Save screenshot of the section
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `chart_${vp.name}.png`), fullPage: false });

      // If desktop, verify they are side by side and do not overlap
      if (vp.width >= 1024) {
        // Trend card right edge should be <= topics card left edge
        const overlap = trendBox.x + trendBox.width > topicsBox.x;
        console.log(`[${vp.name}] Overlap check: trendRight=${trendBox.x + trendBox.width}, topicsLeft=${topicsBox.x}, overlap=${overlap}`);
        expect(trendBox.x + trendBox.width).toBeLessThanOrEqual(topicsBox.x + 2); // allowing 2px margin of error
      } else {
        // If tablet or mobile, they should be stacked (trend card above topics card)
        expect(trendBox.y + trendBox.height).toBeLessThanOrEqual(topicsBox.y + 2);
      }

      // Verify no horizontal scroll on page
      expect(hasHorizontalScroll).toBe(false);
    });
  }

  test('Chart hover tooltip displays correctly within boundaries', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.getByText('Media Coverage Trend Over Time')).toBeVisible();

    // Hover the last bar (most recent)
    const chartBars = page.locator('text=Media Coverage Trend Over Time')
      .locator('xpath=ancestor::div[contains(@class, "bg-white") and contains(@class, "rounded-xl")][1]')
      .locator('.group.cursor-pointer');
    
    const count = await chartBars.count();
    expect(count).toBeGreaterThan(0);

    const lastBar = chartBars.last();
    await lastBar.hover();
    await page.waitForTimeout(300);

    // Verify tooltip appears
    const tooltip = page.locator('.group.cursor-pointer .z-30');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/Oct|2026/);

    // Verify topics card is NOT covered by tooltip
    const topicsCard = page.locator('text=Hot Political Topics').locator('xpath=ancestor::div[contains(@class, "bg-white") and contains(@class, "rounded-xl")][1]');
    const tooltipBox = await tooltip.boundingBox();
    const topicsBox = await topicsCard.boundingBox();

    expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(topicsBox.x + 2);
  });

  test('LIVE / DEMO mode toggle updates chart consistently', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Initially LIVE mode
    await expect(page.getByText('Media Coverage Trend Over Time')).toBeVisible();
    const liveRangeBtn = page.getByRole('button', { name: /All \(\d+\)/ });
    await expect(liveRangeBtn).toBeVisible();

    // Switch to DEMO mode
    const demoBtn = page.getByRole('button', { name: 'DEMO' });
    await demoBtn.click();
    await page.waitForTimeout(500);

    // Verify Demo mode headline and chart update
    await expect(page.getByText('Curated Demo Mode (8 reports)')).toBeVisible();
    await expect(page.getByText('Showing 4 cycles')).toBeVisible();

    // Switch back to LIVE mode
    const liveBtn = page.getByRole('button', { name: 'LIVE' });
    await liveBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Real Tamil Media Stream/)).toBeVisible();
  });

  test('Empty search state displays gracefully without layout corruption', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Type impossible search query
    const searchInput = page.locator('input[aria-label="Search articles"]');
    await searchInput.fill('zzznonexistentsearchterm999');
    await page.waitForTimeout(500);

    // Verify empty trend state and topics empty state
    await expect(page.getByText('No media coverage trend data available')).toBeVisible();
    await expect(page.getByText('No topics recorded for current filter')).toBeVisible();

    // Verify no document horizontal scroll
    const hasScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasScroll).toBe(false);
  });
});
