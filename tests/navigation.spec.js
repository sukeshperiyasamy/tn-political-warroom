const { test, expect } = require('@playwright/test');

const ROUTES = [
  { href: '/', heading: 'Overview' },
  { href: '/news', heading: 'News Feed' },
  { href: '/trending', heading: /Trending/i },
  { href: '/brief', heading: /Brief/i },
  { href: '/compare', heading: /Compar/i },
  { href: '/lab', heading: /Discovery|Lab/i },
  { href: '/studio', heading: /Studio|Card/i },
  { href: '/admin', heading: /Admin/i },
];

test.describe('App shell navigation (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sidebar links reach every section and mark the current page', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link')).toHaveCount(ROUTES.length);

    for (const { href } of ROUTES) {
      await nav.locator(`a[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href === '/' ? '/$' : href}$`));
      await expect(nav.locator(`a[href="${href}"]`)).toHaveAttribute('aria-current', 'page');
    }
  });

  test('global search jumps to the news feed with the query applied', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Search articles' }).fill('DMK');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/news$/);
    await expect(page.getByRole('button', { name: /Remove filter Search: DMK/ })).toBeVisible();
  });
});

test.describe('App shell navigation (mobile)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hamburger opens the drawer, link closes it, no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Navigation menu' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('link', { name: 'News Feed' }).click();
    await expect(page).toHaveURL(/\/news$/);
    await expect(dialog).toBeHidden();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
