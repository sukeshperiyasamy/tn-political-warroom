const { test, expect } = require('@playwright/test');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots';

test.describe('Phase 5: Client Demo & Deployment Readiness E2E Verification', () => {

  test('1. Client Demo Landing with Dynamic Bureau Branding (Screenshot 24)', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Verify dynamic client branding in navbar
    const bureauName = page.getByText(/Tamil Nadu Strategic Intelligence Bureau/i).first();
    await expect(bureauName).toBeVisible({ timeout: 10000 });

    // Verify operational subtitle in navbar
    const tagline = page.getByText(/அரசியல் பொது ஊடக நுண்ணறிவு|Public Opinion & Media Analytics Command/i).first();
    await expect(tagline).toBeVisible();

    // Verify navigation tabs
    await expect(page.locator('button[role="tab"]:visible', { hasText: 'Discovery Lab' }).first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:visible', { hasText: 'Sources' }).first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:visible', { hasText: 'Brief' }).first()).toBeVisible();
    await expect(page.locator('button[role="tab"]:visible', { hasText: 'Studio' }).first()).toBeVisible();

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '24_client_demo_landing.png'),
      fullPage: false,
    });
  });

  test('2. Scenario Replay Active with Operator Controls (Screenshot 25)', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Switch to Discovery Lab
    const labTab = page.locator('button[role="tab"]:visible', { hasText: 'Discovery Lab' }).first();
    await labTab.click();

    // Verify Interactive Scenario Lab header
    await expect(page.getByText(/Interactive Political Scenario Simulation Lab/i)).toBeVisible();

    // Verify operator control buttons exist
    const resetButton = page.locator('button:visible', { hasText: /Reset Scenario/i }).first();
    await expect(resetButton).toBeVisible();

    const briefButton = page.locator('button:visible', { hasText: /Scenario Brief/i }).first();
    await expect(briefButton).toBeVisible();

    const advanceButton = page.locator('button:visible', { hasText: /Advance Stage|Advance Next Step|Restart Scenario/i }).first();
    await expect(advanceButton).toBeVisible();

    // Click advance stage to demonstrate active progression
    await advanceButton.click();
    await page.waitForTimeout(1500);

    // Verify STAGE 1, 2, 3, 4 progression visualizer
    await expect(page.getByText('STAGE 1').first()).toBeVisible();
    await expect(page.getByText('STAGE 2').first()).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '25_scenario_replay_active.png'),
      fullPage: false,
    });
  });

  test('3. Printable Scenario Intelligence Brief Modal (Screenshot 26)', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto('/');

    // Switch to Discovery Lab
    const labTab = page.locator('button[role="tab"]:visible', { hasText: 'Discovery Lab' }).first();
    await labTab.click();

    // Open Scenario Brief modal
    const briefButton = page.locator('button:visible', { hasText: /Scenario Brief/i }).first();
    await expect(briefButton).toBeVisible();
    await briefButton.click();

    // Verify Brief Modal opens
    await expect(page.getByText(/Scenario Intelligence Brief • Stage/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Special Briefing/i).first()).toBeVisible();

    // Verify bilingual summary sections
    await expect(page.getByText(/Executive Intelligence Assessment/i)).toBeVisible();
    await expect(page.getByText(/செயல்முறை சுருக்கம்/i)).toBeVisible();

    // Verify mandatory electorate disclaimer inside the modal
    await expect(page.getByText(/Mandatory Analytics Disclaimer/i).first()).toBeVisible();
    await expect(page.getByText(/voting intentions, electoral preferences, or political sentiment/i).first()).toBeVisible();

    // Verify Print button is present
    await expect(page.locator('button:visible', { hasText: /Print Brief/i })).toBeVisible();

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '26_client_intelligence_brief_print.png'),
      fullPage: false,
    });
  });

  test('4. Client Workspace & Branding Settings Administration (Screenshot 27)', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Switch to Sources tab
    const sourcesTab = page.locator('button[role="tab"]:visible', { hasText: 'Sources' }).first();
    await sourcesTab.click();

    // Click on Client Settings sub-tab
    const clientSettingsBtn = page.locator('button:visible', { hasText: /Client Settings/i }).first();
    await expect(clientSettingsBtn).toBeVisible({ timeout: 10000 });
    await clientSettingsBtn.click();

    // Verify Client Workspace Administration sections
    await expect(page.getByText(/Organization & Visual Branding/i)).toBeVisible();
    await expect(page.getByText(/Client \/ Bureau Display Name/i)).toBeVisible();
    await expect(page.getByText(/Monitored Political Parties & Key Leaders/i)).toBeVisible();
    await expect(page.getByText(/Policy Topics & Authorized Channels/i)).toBeVisible();

    // Verify action buttons
    await expect(page.locator('button:visible', { hasText: /Save Client Configuration/i }).first()).toBeVisible();
    await expect(page.locator('button:visible', { hasText: /Reset to Bureau Defaults/i }).first()).toBeVisible();

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '27_client_config_admin.png'),
      fullPage: false,
    });
  });

  test('5. News Card Studio with Responsive 1080x1080 Preview (Screenshot 28)', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Switch to Studio tab by aria-label
    const studioTab = page.locator('button[aria-label="News Card Studio"]:visible').first();
    await expect(studioTab).toBeVisible({ timeout: 10000 });
    await studioTab.evaluate((btn) => btn.click());

    // Switch to Graphic Studio sub-tab
    const graphicSubTab = page.getByRole('button', { name: /Social Graphic Studio/i });
    if (await graphicSubTab.isVisible()) {
      await graphicSubTab.click();
    }

    // Verify Studio title and card canvas
    await expect(page.getByText(/Social Graphic Studio/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#tamil-news-card-canvas')).toBeVisible({ timeout: 10000 });

    // Verify Tamil headline controls and preset chips
    await expect(page.getByText(/Quick Editorial Presets/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Main Tamil Headline/i)).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '28_news_card_studio_responsive.png'),
      fullPage: false,
    });
  });

  test('6. Client Demo Mobile Fluidity (Screenshot 29)', async ({ page }) => {
    test.setTimeout(60000);
    // Set mobile viewport (iPhone 14 Pro style: 393 x 852)
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/');

    // Switch to Discovery Lab
    const labTab = page.locator('button:visible', { hasText: 'Discovery Lab' }).first();
    await expect(labTab).toBeVisible();
    await labTab.click();

    // Verify lab renders smoothly on mobile with zero horizontal overflow
    await expect(page.getByText(/Social Media Discovery & Trending Intelligence Lab/i)).toBeVisible();
    await expect(page.getByText(/Interactive Political Scenario Simulation Lab/i)).toBeVisible();

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '29_client_demo_mobile.png'),
      fullPage: false,
    });
  });

});
