// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('TN Political Warroom Admin Panel', () => {

  test('Navbar includes Admin button and navigates to Admin login', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify Admin nav button exists
    const adminNavBtn = page.getByRole('tab', { name: /Admin/i });
    await expect(adminNavBtn).toBeVisible();

    // Click Admin
    await adminNavBtn.click();

    // Verify Admin Login screen is displayed
    await expect(page.getByText('War Room Administration Login')).toBeVisible();
    await expect(page.getByText('Development Demo Access Only')).toBeVisible();
    await expect(page.getByPlaceholder('admin')).toBeVisible();
  });

  test('Admin dummy login rejects invalid credentials', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Admin/i }).click();

    // Fill invalid credentials
    await page.getByPlaceholder('admin').fill('admin');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In to Admin Panel/i }).click();

    // Verify error message
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  });

  test('Admin login succeeds with demo credentials and loads all 6 admin sections', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /Admin/i }).click();

    // Fill predefined demo credentials
    await page.getByRole('button', { name: /Fill Predefined Demo Credentials/i }).click();
    await page.getByRole('button', { name: /Sign In to Admin Panel/i }).click();

    // Verify Admin Dashboard header
    await expect(page.getByText('TN War Room Central Administration')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('admin (Dev Demo)')).toBeVisible();

    // Section 1: Dashboard Overview
    await expect(page.getByText(/Registered Publishers/i).first()).toBeVisible();
    await expect(page.getByText(/Political Entities & Keywords/i)).toBeVisible();

    // Section 2: Sources & Publishers
    const sourcesTab = page.getByRole('button', { name: /Sources & Publishers/i });
    await sourcesTab.click();
    await expect(page.getByText(/Tamil News Portal|News Media/i).first()).toBeVisible();

    // Section 3: Keywords & Filters
    const keywordsTab = page.getByRole('button', { name: /Keywords & Filters/i });
    await keywordsTab.click();
    await expect(page.getByText(/Political Keywords & Entity Filters/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Keyword \/ Topic/i })).toBeVisible();

    // Test Add Keyword Modal opens and closes
    await page.getByRole('button', { name: /Add Keyword \/ Topic/i }).click();
    await expect(page.getByText('Add New Political Keyword Topic')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Section 4: Feed Ingestion
    const ingestionTab = page.getByRole('button', { name: /Feed Ingestion/i });
    await ingestionTab.click();
    await expect(page.getByText(/Feed Ingestion Engine & Audit Telemetry/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Trigger Full Ingestion Run/i })).toBeVisible();

    // Test Ingestion Confirmation Dialog
    await page.getByRole('button', { name: /Trigger Full Ingestion Run/i }).click();
    await expect(page.getByText('Confirm Full Ingestion Execution')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Section 5: Trending Configuration
    const trendingTab = page.getByRole('button', { name: /Trending Configuration/i });
    await trendingTab.click();
    await expect(page.getByText(/Algorithmic Trending Configuration/i)).toBeVisible();
    await expect(page.getByText(/Engagement Momentum Weight/i)).toBeVisible();
    await expect(page.getByText(/Total Allocation:/i)).toBeVisible();

    // Section 6: Application Settings
    const settingsTab = page.getByRole('button', { name: /Application Settings/i });
    await settingsTab.click();
    await expect(page.getByText(/Application & Workspace Settings/i)).toBeVisible();
    await expect(page.getByText(/Production Security Compliance Boundary/i)).toBeVisible();

    // Test Sign Out
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page.getByText('War Room Administration Login')).toBeVisible();
  });

  test('Direct URL /admin requires dummy login', async ({ page }) => {
    // Navigate to /admin without pre-existing session
    await page.goto('http://127.0.0.1:3000/admin');
    await page.waitForLoadState('domcontentloaded');

    // Should prompt for login
    await expect(page.getByText('War Room Administration Login')).toBeVisible();
    await expect(page.getByPlaceholder('admin')).toBeVisible();
  });
});
