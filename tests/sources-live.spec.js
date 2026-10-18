const { test, expect } = require('@playwright/test');

test.describe('TN Political War Room - Live Tamil News Source Integration & Management', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Live Mode displays real publisher stream and distinct live indicator', async ({ page }) => {
    // Check mode indicator in navbar
    const livePill = page.locator('span', { hasText: 'LIVE RSS' }).first();
    await expect(livePill).toBeVisible();

    // Check header banner indicator
    await expect(page.getByText(/Real Tamil Media Stream/i)).toBeVisible();

    // Verify articles rendered have LIVE RSS badge and real publisher source
    const firstArticle = page.locator('article').first();
    await expect(firstArticle).toBeVisible();
    await expect(firstArticle.getByText('LIVE RSS')).toBeVisible();

    // Check that publisher name is one of the verified sources
    const sourceText = await firstArticle.locator('span.font-bold').first().innerText();
    expect([
      'News18 Tamil Nadu',
      'Polimer News',
      'BBC News Tamil',
      'The Hindu (Tamil Nadu)',
      'OneIndia Tamil',
      'Muthanmai Reporter (Tamil Nadu)',
      'Muthanmai Reporter (Politics)'
    ]).toContain(sourceText);

    // Check NLP attribution notice on card
    await expect(firstArticle.getByText(/Automated NLP Entity & Sentiment Attribution/i)).toBeVisible();
  });

  test('2. Mode toggle switches cleanly between Live RSS and Demo dataset', async ({ page }) => {
    // Switch to Demo Mode
    const demoBtn = page.getByRole('button', { name: /DEMO/i });
    await demoBtn.click();
    await page.waitForTimeout(300);

    // Verify Demo mode indicator and banner
    await expect(page.getByText(/Curated Demo Mode/i)).toBeVisible();

    // Verify articles show SEEDED DEMO badge
    const article = page.locator('article').first();
    await expect(article.getByText('SEEDED DEMO')).toBeVisible();

    // Switch back to Live Mode
    const liveBtn = page.getByRole('button', { name: /LIVE/i });
    await liveBtn.click();
    await page.waitForTimeout(300);

    // Verify back in Live mode
    await expect(page.getByText(/Real Tamil Media Stream/i)).toBeVisible();
    await expect(page.locator('article').first().getByText('LIVE RSS')).toBeVisible();
  });

  test('3. Sources & Ingestion tab lists configured publishers with health status', async ({ page }) => {
    // Click Sources & Ingestion tab
    const sourcesTab = page.getByRole('tab', { name: /Sources & Ingestion/i });
    await sourcesTab.click();

    // Verify Sources Hub header
    await expect(page.getByRole('heading', { name: /Source Management & Feed Freshness Hub/i })).toBeVisible();

    // Check summary metric cards
    await expect(page.getByText('Registered Publishers')).toBeVisible();
    await expect(page.getByText('Real Articles Ingested')).toBeVisible();
    await expect(page.getByText('Duplicates Prevented')).toBeVisible();
    await expect(page.getByText('Pipeline Freshness')).toBeVisible();

    // Verify table lists key Tamil news publishers
    const publishersTable = page.locator('table').first();
    await expect(publishersTable.getByText('News18 Tamil Nadu')).toBeVisible();
    await expect(publishersTable.getByText('Polimer News')).toBeVisible();
    await expect(publishersTable.getByText('BBC News Tamil')).toBeVisible();
    await expect(publishersTable.getByText('The Hindu (Tamil Nadu)')).toBeVisible();

    // Check that Collection Timestamps and Article Processing columns are present
    await expect(page.getByText('Collection Timestamps')).toBeVisible();
    await expect(page.getByText('Article Processing Health')).toBeVisible();
  });

  test('4. Test Feed inspection modal displays real XML parsed response', async ({ page }) => {
    // Go to Sources tab
    await page.getByRole('tab', { name: /Sources & Ingestion/i }).click();

    // Find the row for Polimer News in the publishers table and click Test
    const publishersTable = page.locator('table').first();
    const polimerRow = publishersTable.locator('tr').filter({ hasText: 'Polimer News' });
    await expect(polimerRow).toBeVisible();
    const testBtn = polimerRow.getByRole('button', { name: 'Test' });
    await testBtn.click();

    // Wait for the Endpoint Inspection modal to appear
    await expect(page.getByText('Endpoint Inspection: Polimer News')).toBeVisible({ timeout: 10000 });

    // Verify status code HTTP 200, latency, and sample articles
    await expect(page.getByText(/HTTP 200/i)).toBeVisible();
    await expect(page.getByText('Sample Articles from XML Stream')).toBeVisible();

    // Close the inspector modal
    await page.getByRole('button', { name: 'Close Inspector' }).click();
    await expect(page.getByText('Endpoint Inspection: Polimer News')).not.toBeVisible();
  });

  test('5. Live article handoff to AI Intelligence and News Card Studio', async ({ page }) => {
    // Open AI Insights on the first live article
    const firstArticle = page.locator('article').first();
    const originalHeadline = await firstArticle.locator('h3').innerText();
    await firstArticle.getByRole('button', { name: /AI Insights/i }).click();

    // Verify AI Drawer opens
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(/Tamil Executive Summary/i)).toBeVisible();

    // Click "Proceed to News Card Studio"
    const proceedBtn = drawer.getByRole('button', { name: /Proceed to News Card Studio/i });
    await proceedBtn.click();

    // Card Studio opens and canvas is visible
    await expect(page.getByText('Tamil News Card Studio (1080×1080 Social Export)')).toBeVisible();
    const canvas = page.locator('#tamil-news-card-canvas');
    await expect(canvas).toBeVisible();

    // Check that canvas contains text
    await expect(canvas).toContainText('TN POLITICAL WAR ROOM');
  });

  test('6. Data Integrity Notice displays accurate polling interval and freshness timestamps', async ({ page }) => {
    // Navigate to Dashboard tab
    const dashboardTab = page.getByRole('tab', { name: /Dashboard/i });
    if (await dashboardTab.isVisible()) {
      await dashboardTab.click();
    }

    // Check Data Integrity Notice on Dashboard
    const integrityNotice = page.getByText(/Data Integrity Notice:/i).locator('..');
    await expect(integrityNotice).toBeVisible();
    await expect(integrityNotice).toContainText('Periodic 15-minute RSS polling');
    await expect(integrityNotice).toContainText('HTTP 304 conditional validation');

    // Switch to Demo mode
    const demoBtn = page.getByRole('button', { name: /DEMO/i });
    await demoBtn.click();
    await page.waitForTimeout(300);

    // Verify Demo integrity notice
    await expect(integrityNotice).toContainText('Curated benchmark dataset: includes');
  });
});
