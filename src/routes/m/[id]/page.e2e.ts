import { expect, test } from '@playwright/test';

test('SSR grid paints and autosaves without a Submit button', async ({ page }) => {
	await page.goto('/');
	await page.locator('[data-date][data-in-month]').last().click();
	await page.getByRole('button', { name: 'Times →' }).click();
	await page.getByRole('button', { name: 'Get the link →' }).click();
	await page.getByRole('button', { name: 'Add your times →' }).click();

	await expect(page).toHaveURL(/\/m\/[A-Za-z0-9_-]{22}$/);
	await expect(page.getByPlaceholder(/^Guest /)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
	await expect(page.locator('[data-slot="0"]')).toBeVisible();

	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	await put;
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();
});

test('missing meeting shows the not-found line', async ({ page }) => {
	await page.goto('/m/aaaaaaaaaaaaaaaaaaaaaa');
	await expect(page.getByText("That link doesn't work. Check you copied all of it.")).toBeVisible();
});
