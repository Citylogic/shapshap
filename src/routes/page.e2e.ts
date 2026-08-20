import { expect, test } from '@playwright/test';
import { pickDay } from '../../e2e/flow';

const LINK_RE = /\/m\/[A-Za-z0-9_-]{22}$/;

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
	await pickDay(page);
	await expect(times).toBeEnabled();
	await times.click();
	await expect(page.getByRole('heading', { name: 'What times?' })).toBeVisible();
	await expect(page.getByLabel('From')).toHaveValue('08:00');
	await expect(page.getByLabel('To')).toHaveValue('20:00');
	await expect(page.getByRole('button', { name: 'Get the link →' })).toBeEnabled();
});

test('days then times then a full copyable link', async ({ page }) => {
	await page.goto('/');
	await pickDay(page);
	await page.getByRole('button', { name: 'Times →' }).click();
	await page.getByRole('button', { name: 'Get the link →' }).click();

	await expect(page.getByRole('heading', { name: 'Shap.' })).toBeVisible();
	const link = page.locator('[data-meeting-link]');
	await expect(link).toBeVisible();
	const href = (await link.textContent()) ?? '';
	expect(href).toMatch(LINK_RE);
	expect(href).not.toContain('…');
	expect(href).not.toContain('...');

	const copy = page.getByRole('button', { name: 'Copy link' });
	await copy.click();
	await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();

	await expect(
		page.getByText("This link is the only way back in. We can't recover it and neither can you.")
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add your times →' })).toBeVisible();
});

test('Why opens the trust note', async ({ page }) => {
	await page.goto('/');
	const why = page.getByRole('link', { name: 'Why →' });
	await expect(why).toHaveAttribute('href', /why/);
	await page.goto('/why');
	await expect(page).toHaveURL(/\/why$/);
	await expect(page.getByText('No accounts, and not much kept.')).toBeVisible();
	await expect(page.getByText('github.com/Citylogic/shapshap')).toBeVisible();
});
