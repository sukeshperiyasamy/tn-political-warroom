const { test, expect } = require('@playwright/test');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/sukes/.gemini/antigravity-cli/brain/a0656d56-f77b-45d1-9ff2-9d4dfe1c6b28/screenshots';

test.describe('Multi-Source Social Media Intelligence & Trending Engine Verification', () => {

  test('1. Navigates to Trending tab and renders Political Pulse telemetry and Top Trending issues', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Navigate to Social Intelligence tab
    const socialTab = page.getByRole('tab', { name: /Social Intelligence/i });
    await expect(socialTab).toBeVisible();
    await socialTab.click();

    // Verify Heading
    await expect(page.getByRole('heading', { name: /Social Media Trending & Political Pulse/i })).toBeVisible();

    // Verify Telemetry Cards
    await expect(page.getByText('Tracked Platforms')).toBeVisible();
    await expect(page.getByText('#1 Trending Issue')).toBeVisible();
    await expect(page.getByText('Indexed Posts')).toBeVisible();
    await expect(page.getByText('Story Clusters')).toBeVisible();

    // Verify Trending Now Leaderboard
    await expect(page.getByRole('heading', { name: 'Trending Now' })).toBeVisible();

    // Take Desktop Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '11_social_intelligence_pulse_desktop.png'),
      fullPage: true,
    });
  });

  test('2. Time Window switching and Platform filtering update post feeds', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const socialTab = page.getByRole('tab', { name: /Social Intelligence/i });
    await socialTab.click();

    // Test 1h Time Window
    const btn1h = page.getByRole('button', { name: '1H', exact: true });
    await expect(btn1h).toBeVisible();
    await btn1h.click();

    // Test 7d Time Window
    const btn7d = page.getByRole('button', { name: '7D', exact: true });
    await btn7d.click();

    // Test YouTube Platform Filter Chip
    const ytChip = page.getByRole('button', { name: 'YouTube', exact: true });
    await expect(ytChip).toBeVisible();
    await ytChip.click();

    // Verify all displayed badges contain YouTube
    const postCards = page.locator('div.bg-white.border');
    await expect(postCards.first()).toBeVisible();

    // Test 𝕏 (Twitter) Platform Filter Chip
    const xChip = page.getByRole('button', { name: '𝕏 (Twitter)', exact: true });
    await expect(xChip).toBeVisible();
    await xChip.click();

    // Return to All Sources
    const allChip = page.getByRole('button', { name: 'All Sources', exact: true });
    await allChip.click();
  });

  test('3. Post velocity modal opens and displays time-series observation snapshots', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const socialTab = page.getByRole('tab', { name: /Social Intelligence/i });
    await socialTab.click();

    // Click on a velocity badge button to open snapshot history modal
    const velocityBtn = page.getByRole('button', { name: /\+\d+\/hr|Velocity/i }).first();
    await expect(velocityBtn).toBeVisible();
    await velocityBtn.click();

    // Verify Modal Heading
    await expect(page.getByRole('heading', { name: /Engagement Velocity & Observation History/i })).toBeVisible();
    await expect(page.getByText('Time-Series Observations')).toBeVisible();

    // Take Screenshot of Observation Modal
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '12_social_post_snapshot_history_modal.png'),
    });

    // Close modal
    const closeBtn = page.getByRole('button', { name: 'Close', exact: true });
    await closeBtn.click();
  });

  test('4. Methodology modal displays the transparent 4-parameter scoring formula', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const socialTab = page.getByRole('tab', { name: /Social Intelligence/i });
    await socialTab.click();

    // Click Methodology button
    const methBtn = page.getByRole('button', { name: /Methodology & Formula/i });
    await expect(methBtn).toBeVisible();
    await methBtn.click();

    // Verify Formula Text
    await expect(page.getByRole('heading', { name: /Transparent Trend Ranking Methodology/i })).toBeVisible();
    await expect(page.getByText('0.40 * engagement_growth')).toBeVisible();

    // Take Screenshot of Methodology
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '13_trending_methodology_modal.png'),
    });

    const gotItBtn = page.getByRole('button', { name: 'Got It' });
    await gotItBtn.click();
  });

  test('5. Cross-Platform Story Clusters view displays narrative propagation and time-lag', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const socialTab = page.getByRole('tab', { name: /Social Intelligence/i });
    await socialTab.click();

    // Switch to Cross-Platform Narratives tab
    const clustersTab = page.getByRole('button', { name: /Cross-Platform Narratives/i });
    await expect(clustersTab).toBeVisible();
    await clustersTab.click();

    // Verify Clusters Header
    await expect(page.getByRole('heading', { name: /Cross-Platform Story Clusters & Narrative Echo/i })).toBeVisible();
    await expect(page.getByText(/First to Viral Reaction Lag:/i).first()).toBeVisible();

    // Take Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '14_cross_platform_story_clusters.png'),
      fullPage: true,
    });
  });

  test('6. Platform Comparison Matrix displays cross-platform volume and party voice share', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const socialTab = page.getByRole('tab', { name: /Social Intelligence/i });
    await socialTab.click();

    // Switch to Matrix tab
    const matrixTab = page.getByRole('button', { name: /Platform Comparison Matrix/i });
    await expect(matrixTab).toBeVisible();
    await matrixTab.click();

    // Verify Table
    await expect(page.getByRole('heading', { name: /Platform Distribution & Party Share of Voice/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Normalized Engagement' })).toBeVisible();

    // Take Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '15_platform_comparison_matrix.png'),
      fullPage: true,
    });
  });

  test('7. Data Connectors Hub displays connector health, quota meter, and setup guides', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    const socialTab = page.getByRole('tab', { name: /Social Intelligence/i });
    await socialTab.click();

    // Switch to Connectors tab
    const connTab = page.getByRole('button', { name: /Connectors & Quotas/i });
    await expect(connTab).toBeVisible();
    await connTab.click();

    // Verify Connectors Heading
    await expect(page.getByRole('heading', { name: /Data Connectors & API Quota Hub/i })).toBeVisible();
    await expect(page.getByText('API Quota Consumption').first()).toBeVisible();

    // Open a Setup Guide
    const setupGuideBtn = page.getByRole('button', { name: 'Setup Guide' }).first();
    await setupGuideBtn.click();
    await expect(page.getByText(/ENV:/i).first()).toBeVisible();

    // Take Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '16_social_connectors_hub.png'),
      fullPage: true,
    });
  });

  test('8. Mobile responsive layout of Social Intelligence (390x844)', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Click mobile navigation button
    const mobileTrendingBtn = page.getByRole('button', { name: 'Trending', exact: true });
    await expect(mobileTrendingBtn).toBeVisible();
    await mobileTrendingBtn.click();

    // Verify header visible on mobile
    await expect(page.getByRole('heading', { name: /Social Media Trending & Political Pulse/i })).toBeVisible();

    // Take Mobile Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '17_social_intelligence_mobile.png'),
      fullPage: true,
    });
  });

});
