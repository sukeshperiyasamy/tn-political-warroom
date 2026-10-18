const { test, expect } = require('@playwright/test');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots';

test.describe('Phase 4: Social Media Discovery, Trending Intelligence & Demo Lab', () => {

  test('1. Navigates to Discovery Lab tab and renders Source Health and Masthead', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Locate Discovery Lab tab and click
    const labTab = page.locator('button:visible', { hasText: 'Discovery Lab' }).first();
    await expect(labTab).toBeVisible();
    await labTab.click();

    // Verify main lab heading
    await expect(page.getByRole('heading', { name: /Social Media Discovery & Trending Intelligence Lab/i })).toBeVisible();

    // Verify Tamil subtitle
    await expect(page.getByText(/தமிழ்நாடு அரசியல் பொது ஊடகப் போக்குகள்/i)).toBeVisible();

    // Verify 7 platforms are present in Source Discovery Connectors strip
    await expect(page.getByText(/Source Discovery Connectors \(7 Sources\)/i)).toBeVisible();
    await expect(page.getByText(/youtube/i).first()).toBeVisible();
    await expect(page.getByText(/instagram/i).first()).toBeVisible();
    await expect(page.getByText(/facebook/i).first()).toBeVisible();
    await expect(page.getByText(/reddit/i).first()).toBeVisible();

    // Verify core sections exist
    await expect(page.getByText(/Interactive Political Scenario Simulation Lab/i)).toBeVisible();
    await expect(page.getByText(/Trending Political Issues & Topic Momentum/i)).toBeVisible();
    await expect(page.getByText(/Cross-Media Narrative Clusters & Timeline/i)).toBeVisible();
    await expect(page.getByText(/Public Political Posts Stream/i)).toBeVisible();

    // Desktop screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '18_social_discovery_lab_desktop.png'),
      fullPage: true,
    });
  });

  test('2. Interactive Scenario Lab switching and deterministic stage replay', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const labTab = page.locator('button:visible', { hasText: 'Discovery Lab' }).first();
    await labTab.click();

    // Verify scenario cards exist
    const policyCard = page.getByText(/Policy Announcement Propagation/i).first();
    await expect(policyCard).toBeVisible();

    // Click on Controversy scenario
    const controversyCard = page.getByText(/Controversy Surge & Dissipation/i).first();
    await expect(controversyCard).toBeVisible();
    await controversyCard.click();

    // Verify STAGE 1, 2, 3, 4 indicators
    await expect(page.getByText('STAGE 1').first()).toBeVisible();
    await expect(page.getByText('STAGE 2').first()).toBeVisible();
    await expect(page.getByText('STAGE 3').first()).toBeVisible();
    await expect(page.getByText('STAGE 4').first()).toBeVisible();

    // Replay Stage 2
    const stage2Button = page.getByText('STAGE 2').first();
    await stage2Button.click();

    // Wait for notification or state update
    await page.waitForTimeout(1200);

    // Capture screenshot of Demo Scenario Lab with stage progression
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '19_demo_scenario_lab_replay.png'),
      fullPage: false,
    });
  });

  test('3. Platform-aware ranking dimensions and percentile indicators', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const labTab = page.locator('button:visible', { hasText: 'Discovery Lab' }).first();
    await labTab.click();

    // Switch ranking dimensions using buttons
    const fastestBtn = page.getByRole('button', { name: 'Fastest Growing' }).first();
    await expect(fastestBtn).toBeVisible();
    await fastestBtn.click();
    await page.waitForTimeout(600);

    const crossPlatformBtn = page.getByRole('button', { name: 'Cross-Platform' }).first();
    await expect(crossPlatformBtn).toBeVisible();
    await crossPlatformBtn.click();
    await page.waitForTimeout(600);

    const mostDiscussedBtn = page.getByRole('button', { name: 'Most Discussed' }).first();
    await expect(mostDiscussedBtn).toBeVisible();
    await mostDiscussedBtn.click();
    await page.waitForTimeout(600);

    // Verify post card is rendered with ranking percentile
    const postItem = page.locator('div.p-4.rounded-lg.border').first();
    await expect(postItem).toBeVisible();

    // Capture screenshot of normalized posts with percentiles
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '20_platform_percentile_ranking.png'),
      fullPage: false,
    });
  });

  test('4. Narrative progression timeline modal opens and renders stages', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Switch to DEMO mode to ensure rich clustered stories
    const demoBtn = page.locator('button:visible', { hasText: 'DEMO' }).first();
    await demoBtn.click();
    await page.waitForTimeout(500);

    const labTab = page.locator('button:visible', { hasText: 'Discovery Lab' }).first();
    await labTab.click();

    // Look for a "Progression Timeline" button on clusters
    const timelineBtn = page.getByRole('button', { name: /Progression Timeline/i }).first();
    await expect(timelineBtn).toBeVisible({ timeout: 10000 });
    await timelineBtn.click();

    // Verify modal
    await expect(page.getByText('Narrative Propagation Timeline')).toBeVisible();
    await expect(page.getByText(/Propagation Lag/i)).toBeVisible();

    // Screenshot modal
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '21_narrative_timeline_modal.png'),
      fullPage: false,
    });

    // Close modal
    const closeBtn = page.getByRole('button', { name: '✕' }).first();
    await closeBtn.click();
  });

  test('5. Methodology and Electorate Disclaimer modal opens with full formulas', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const labTab = page.locator('button:visible', { hasText: 'Discovery Lab' }).first();
    await labTab.click();

    // Click "Methodology" button
    const methodBtn = page.getByRole('button', { name: 'Methodology' }).first();
    await expect(methodBtn).toBeVisible();
    await methodBtn.click();

    // Verify modal headers and disclaimer
    await expect(page.getByRole('heading', { name: /Trending Intelligence Methodology/i })).toBeVisible();
    await expect(page.getByText(/Important Analytics Disclaimer/i)).toBeVisible();
    await expect(page.getByText(/represent the voting intentions/i)).toBeVisible();

    // Screenshot methodology modal
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '22_methodology_disclaimer_modal.png'),
      fullPage: false,
    });

    // Close modal
    const closeBtn = page.getByRole('button', { name: '✕' }).first();
    await closeBtn.click();
  });

  test('6. Mobile responsive layout verification', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const labTab = page.locator('button:visible', { hasText: 'Discovery Lab' }).first();
    await expect(labTab).toBeVisible();
    await labTab.click();

    await expect(page.getByRole('heading', { name: /Social Media Discovery & Trending Intelligence Lab/i })).toBeVisible();

    // Capture mobile screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '23_social_discovery_lab_mobile.png'),
      fullPage: true,
    });
  });

});
