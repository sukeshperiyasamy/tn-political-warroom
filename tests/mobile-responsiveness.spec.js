const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIRS = [
  path.resolve('C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots'),
  path.resolve('C:/Users/sukes/.gemini/antigravity-cli/brain/1d51dc51-8cb3-4a89-9efe-d5d4ada8fd03/screenshots'),
];

async function captureScreenshot(page, filename, options = {}) {
  for (const dir of SCREENSHOT_DIRS) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, filename), ...options });
    } catch (e) {
      // ignore individual screenshot directory errors
    }
  }
}

test.beforeAll(() => {
  for (const dir of SCREENSHOT_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
});

const VIEWPORTS = [
  { name: 'small-mobile', width: 320, height: 667 },
  { name: 'standard-mobile', width: 375, height: 667 },
  { name: 'modern-mobile', width: 390, height: 844 },
  { name: 'large-mobile', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

test.describe('Mobile Responsiveness & Viewport Audit Suite', () => {

  for (const vp of VIEWPORTS) {
    test(`Zero Horizontal Overflow on ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://127.0.0.1:3000');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      await expect(page.locator('h1')).toBeVisible();

      // Check overflow on Dashboard
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll, `Dashboard had horizontal scroll on ${vp.name} (${vp.width}px)`).toBeFalsy();

      await captureScreenshot(page, `30_responsive_${vp.name}_dashboard.png`, {
        fullPage: false,
      });
    });
  }

  test('Mobile Navigation Drawer: Opens, displays all 8 tabs, and navigates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000');
    await page.waitForLoadState('networkidle');

    // Hamburger button should be visible on mobile
    const menuBtn = page.getByRole('button', { name: /open navigation menu/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Mobile drawer dialog should now be visible
    const drawer = page.getByRole('dialog', { name: /mobile navigation menu/i });
    await expect(drawer).toBeVisible();

    // Verify all 8 section links are in the drawer
    await expect(drawer.getByRole('button', { name: /Overview/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /News Feed/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Trending Now/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Discovery Lab/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Intelligence Brief/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Party Compare/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Admin/i })).toBeVisible();
    await expect(drawer.getByRole('button', { name: /Card Studio/i })).toBeVisible();

    await captureScreenshot(page, '31_mobile_nav_drawer_open.png');

    // Test mobile search input inside drawer
    const mobileSearch = drawer.locator('input[aria-label="Search articles mobile"]');
    await expect(mobileSearch).toBeVisible();
    await mobileSearch.fill('DMK');

    // Click "Card Studio" section in drawer
    await drawer.getByRole('button', { name: /Card Studio/i }).click();

    // Verify drawer closed and Studio opened
    await expect(drawer).not.toBeVisible();
    await expect(page.getByText('3-Version Editorial Engine')).toBeVisible();

    // Check no horizontal scroll in Studio on 390px
    const studioOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(studioOverflow, 'Studio had horizontal scroll on 390px mobile').toBeFalsy();
  });

  test('Studio Workflow on Mobile: 3 versions stacked vertically, in-place edit, and finalization', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to Studio via mobile header pill bar
    const studioNavBtn = page.locator('header').getByRole('button', { name: /Card Studio/i }).first();
    await studioNavBtn.click();

    // Wait for editorial versions to load
    await expect(page.getByText('1. 3-Version Editorial Engine')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Verify the 3 version cards are stacked (all visible on page)
    await expect(page.getByText('Version 1: Summarized News').first()).toBeVisible();
    await expect(page.getByText('Version 2: Detailed News').first()).toBeVisible();
    await expect(page.getByText('Version 3: Social Media / Influencer Format').first()).toBeVisible();

    // Verify action buttons: Copy Text, Send to 1080p Card, and Select as Final Output
    const copyBtn = page.getByRole('button', { name: /copy text/i });
    const pushCardBtn = page.getByRole('button', { name: /send to 1080p card/i });
    const selectFinalBtn = page.getByRole('button', { name: /select as final output|update final version/i });

    await expect(copyBtn).toBeVisible();
    await expect(pushCardBtn).toBeVisible();
    await expect(selectFinalBtn).toBeVisible();

    // Select Version 2 (Detailed News)
    await page.getByText('Version 2: Detailed News').first().click();
    await page.waitForTimeout(300);

    // In-place edit headline textarea
    const headlineTextarea = page.locator('textarea').first();
    await expect(headlineTextarea).toBeVisible();
    const origHeadline = await headlineTextarea.inputValue();
    await headlineTextarea.fill(origHeadline + ' [Verified]');

    // Click "Select as Final Output"
    await selectFinalBtn.click();

    // Verify success confirmation banner
    await expect(page.getByText(/marked as FINAL|saved/i)).toBeVisible();

    await captureScreenshot(page, '32_studio_editorial_finalized_mobile.png');

    // Test "Send to 1080p Card"
    await pushCardBtn.click();

    // Verify tab changed to 1080x1080 Social Graphic Studio
    await expect(page.getByText('1080×1080 Native Social Canvas')).toBeVisible();

    // Verify canvas preview container scales down and does not cause horizontal scroll
    const graphicOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(graphicOverflow, 'Graphic Studio canvas had horizontal scroll on 390px mobile').toBeFalsy();

    await captureScreenshot(page, '33_studio_graphic_canvas_mobile.png');
  });

  test('Admin Sources & Publishers Layout on Mobile: Stacks vertically and tabs wrap cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to Admin via header pill bar
    const adminBtn = page.locator('header').getByRole('button', { name: /Admin/i }).first();
    await adminBtn.click();

    // Fill demo credentials
    await page.getByRole('button', { name: /Fill Predefined Demo Credentials/i }).click();
    await page.getByRole('button', { name: /Sign In to Admin Panel/i }).click();

    // Switch to Sources & Publishers tab
    const sourcesTab = page.getByRole('button', { name: /Sources & Publishers/i });
    await sourcesTab.click();

    // Verify Source Management Hub loads
    await expect(page.getByText(/Source Management & Feed Freshness Hub/i)).toBeVisible({ timeout: 10000 });

    // Verify Group A and Group B tabs
    const groupABtn = page.getByRole('button', { name: /Group A: News/i });
    const groupBBtn = page.getByRole('button', { name: /Group B: Creators/i });
    await expect(groupABtn).toBeVisible();
    await expect(groupBBtn).toBeVisible();

    // Verify Trending Now panel is present and stacked
    await expect(page.getByText(/Trending Now in TN Politics/i)).toBeVisible();

    // Verify no horizontal document overflow
    const sourcesOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(sourcesOverflow, 'Sources page had horizontal scroll on 390px mobile').toBeFalsy();

    await captureScreenshot(page, '34_sources_and_trending_mobile.png');
  });

  test('Discovery Lab Layout on Mobile: Controls and story clusters responsive', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to Discovery Lab via header pill bar
    const labBtn = page.locator('header').getByRole('button', { name: /Discovery Lab/i }).first();
    await labBtn.click();

    // Verify Lab loads
    await expect(page.getByText(/Social Media Discovery & Trending Intelligence Lab/i)).toBeVisible({ timeout: 10000 });

    // Verify connectors and simulation lab
    await expect(page.getByText(/Source Discovery Connectors/i)).toBeVisible();
    await expect(page.getByText(/Interactive Political Scenario Simulation Lab/i)).toBeVisible();

    // Verify zero horizontal scroll
    const labOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(labOverflow, 'Discovery Lab had horizontal scroll on 390px mobile').toBeFalsy();

    await captureScreenshot(page, '35_discovery_lab_mobile.png');
  });

});
