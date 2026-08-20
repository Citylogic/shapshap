import { expect, test } from '@playwright/test';

test('home is wizard step 1', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('shapshap', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Which days?' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Times →' })).toBeDisabled();
	await expect(page.getByText('No accounts. Deleted after.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Why →' })).toBeVisible();
	await expect(page.getByText('Welcome')).toHaveCount(0);
	await expect(page.getByText('Get started')).toHaveCount(0);
	await expect(page.locator('input, textarea')).toHaveCount(0);
});

test('cannot proceed until a day is picked', async ({ page }) => {
	await page.goto('/');
	const times = page.getByRole('button', { name: 'Times →' });
	await expect(times).toBeDisabled();
	await page.locator('[data-date][data-in-month]').nth(10).click();
	await expect(times).toBeEnabled();
	await times.click();
	await expect(page.getByRole('heading', { name: 'What times?' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Get the link →' })).toBeDisabled();
});
