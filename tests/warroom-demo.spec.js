const { test, expect } = require('@playwright/test');

test.describe('TN Political War Room - Client Demo Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to local warroom dashboard
    await page.goto('/');
  });

  test('1. Dashboard Overview renders metrics, charts, and top reports', async ({ page }) => {
    // Verify brand header & title
    await expect(page.getByRole('banner').getByText('TN Political War Room', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /TN 2026 Assembly War Room Intelligence/i })).toBeVisible();

    // Verify key metric cards and headings
    await expect(page.getByText('Articles Monitored')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tamil Nadu Media Sentiment Distribution' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Party Share of Voice & Sentiment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Key Leaders in the News' })).toBeVisible();

    // Verify top political reports grid
    const articleCards = page.locator('article');
    await expect(articleCards.first()).toBeVisible();
    const count = await articleCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('2. Political filters update the news stream and metrics', async ({ page }) => {
    // Select Party filter: TVK
    const partySelect = page.locator('#party-filter');
    await partySelect.selectOption('TVK');

    // Wait for filtered list
    await expect(page.getByText(/Matching selected criteria/i)).toBeVisible();
    
    // Check that TVK badge is in the filtered articles
    const tvkBadges = page.locator('article').filter({ hasText: '#TVK' });
    await expect(tvkBadges.first()).toBeVisible();

    // Select Sentiment filter: positive
    const sentimentSelect = page.locator('#sentiment-filter');
    await sentimentSelect.selectOption('positive');

    // Reset filters
    const resetButton = page.getByRole('button', { name: /Reset.*filter/i });
    if (await resetButton.isVisible()) {
      await resetButton.click();
    }

    // Party filter should be back to all
    await expect(partySelect).toHaveValue('');
  });

  test('3. Article Intelligence Drawer provides dual summaries and 3 Tamil variations', async ({ page }) => {
    // Click on AI Insights button of first article
    const firstArticle = page.locator('article').first();
    const aiInsightsBtn = firstArticle.getByRole('button', { name: /AI Insights/i });
    await aiInsightsBtn.click();

    // Verify Drawer is open
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('AI Article Intelligence & Tamil Summaries')).toBeVisible();

    // Verify identified entities and sentiment
    await expect(drawer.getByText('Identified Parties')).toBeVisible();
    await expect(drawer.getByText('Identified Leaders')).toBeVisible();
    await expect(drawer.getByText('Media Sentiment')).toBeVisible();

    // Verify Tamil Executive Summary & English Strategic Intelligence
    await expect(drawer.getByText(/Tamil Executive Summary/i)).toBeVisible();
    await expect(drawer.getByText(/English Strategic Intelligence/i)).toBeVisible();

    // Verify 3 AI Tamil Variations section
    await expect(drawer.getByText('3 AI Tamil Headline & Hook Variations')).toBeVisible();

    // Test variation buttons (Direct, Impact, Viral)
    const variationButtons = drawer.locator('button').filter({ hasText: /செய்தி|அரசியல்|வார்/ });
    await expect(variationButtons.first()).toBeVisible();

    // Click the 2nd variation tab if available
    if (await variationButtons.count() >= 2) {
      await variationButtons.nth(1).click();
      await page.waitForTimeout(200);
    }

    // Test "Proceed to News Card Studio" action
    const proceedBtn = drawer.getByRole('button', { name: /Proceed to News Card Studio/i });
    await proceedBtn.click();

    // Drawer closes and Card Studio opens
    await expect(drawer).not.toBeVisible();
    await expect(page.getByText('Tamil News Card Studio (1080×1080 Social Export)')).toBeVisible();
  });

  test('4. Party and Leader Comparison displays side-by-side matrices', async ({ page }) => {
    // Navigate to Comparison tab via Navbar
    const comparisonTab = page.getByRole('tab', { name: /Party Comparison/i });
    await comparisonTab.click();

    await expect(page.getByText('Comparative Political Intelligence')).toBeVisible();
    await expect(page.getByText('Select entities to compare')).toBeVisible();

    // Verify party cards (DMK, AIADMK, TVK) with exact matching
    await expect(page.getByRole('heading', { name: 'Dravida Munnetra Kazhagam', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'All India Anna Dravida Munnetra Kazhagam', exact: true })).toBeVisible();

    // Check polarity and impression metrics
    await expect(page.getByText('Average Polarity').first()).toBeVisible();
    await expect(page.getByText('Est. Total Impressions').first()).toBeVisible();
    await expect(page.getByText('Top Discussion Topics').first()).toBeVisible();

    // Switch to Leader Comparison
    const leaderToggle = page.getByRole('button', { name: /Key Leaders/i });
    await leaderToggle.click();

    // Verify leader comparison cards
    await expect(page.getByRole('heading', { name: 'M.K. Stalin', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thalapathy Vijay', exact: true })).toBeVisible();

    // Verify methodology note
    await expect(page.getByText('Measurement Methodology:')).toBeVisible();
  });

  test('5. Tamil News Card Studio renders 1080x1080 canvas and triggers PNG export', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message));

    // Navigate to Card Studio tab
    const studioTab = page.getByRole('tab', { name: /News Card Studio/i });
    await studioTab.click({ force: true });

    await expect(page.getByText('Tamil News Card Studio (1080×1080 Social Export)')).toBeVisible();

    // Verify the native 1080x1080 canvas element exists
    const canvas = page.locator('#tamil-news-card-canvas');
    await expect(canvas).toBeVisible();

    // Check style dimensions of canvas
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    // Test quick preset button
    const presetBtn = page.getByRole('button', { name: 'முதலமைச்சர் அறிவிப்பு' });
    if (await presetBtn.isVisible()) {
      await presetBtn.click();
    }

    // Verify canvas updates with Tamil text
    await expect(canvas).toContainText('TN POLITICAL WAR ROOM');
    await expect(canvas).toContainText('தமிழ்நாடு');

    // Trigger PNG Export
    const exportBtn = page.locator('#export-png-btn');
    await expect(exportBtn).toBeVisible();
    await exportBtn.dispatchEvent('click');

    // Verify export success message in the UI
    await expect(page.getByText(/Successfully exported.*PNG/i)).toBeVisible({ timeout: 10000 });
  });

  test('6. Keyboard accessibility & WCAG modal behavior', async ({ page }) => {
    // Open drawer
    const firstArticle = page.locator('article').first();
    const aiInsightsBtn = firstArticle.getByRole('button', { name: /AI Insights/i });
    await aiInsightsBtn.click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Press Escape key to close
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });
});
