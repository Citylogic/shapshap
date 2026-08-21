import { expect, test } from '@playwright/test';
import { createMeeting, fillSetup } from '../../e2e/flow';

const LINK_RE = /\/m\/[A-Za-z0-9_-]{22}$/;

test('home is the Setup form', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('SHAPSHAP', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Find a time that works' })).toBeVisible();
	await expect(page.getByLabel('Organisation / Company')).toBeVisible();
	await expect(page.getByLabel('Meeting label')).toBeVisible();
	await expect(page.getByLabel('Start date')).toBeVisible();
	await expect(page.getByLabel('End date')).toBeVisible();
	await expect(page.getByRole('switch', { name: 'Include weekends' })).toHaveAttribute(
		'aria-checked',
		'false'
	);
	await expect(page.getByRole('button', { name: 'Generate shareable link →' })).toBeDisabled();
	await expect(page.getByText('No account needed — not for you, not for them')).toBeVisible();
	await expect(page.getByRole('link', { name: 'How it works' })).toBeVisible();
	await expect(page.getByText('Welcome')).toHaveCount(0);
	await expect(page.getByText('Get started')).toHaveCount(0);
	await expect(page.getByLabel('From')).toHaveCount(0);
	await expect(page.getByLabel('To')).toHaveCount(0);
});

test('cannot generate until organisation and meeting label are filled', async ({ page }) => {
	await page.goto('/');
	const go = page.getByRole('button', { name: 'Generate shareable link →' });
	await expect(go).toBeDisabled();
	await page.getByLabel('Organisation / Company').fill('Citylogic');
	await expect(go).toBeDisabled();
	await page.getByLabel('Meeting label').fill('Standup');
	await expect(go).toBeEnabled();
});

test('generate lands on the meeting with a copyable link', async ({ page }) => {
	await page.goto('/');
	await fillSetup(page, { weekends: true });
	await page.getByRole('button', { name: 'Generate shareable link →' }).click();
	await expect(page).toHaveURL(LINK_RE);

	const copy = page.getByRole('button', { name: 'Copy link' });
	await expect(copy).toBeVisible();
	await copy.click();
	await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
});

test('createMeeting helper reaches a named grid', async ({ page }) => {
	await createMeeting(page);
	await expect(page.getByPlaceholder(/^Guest /)).toHaveValue('Ada Lovelace');
	await expect(page.locator('[data-slot="0"]')).toBeVisible();
});

test('How it works opens the trust note', async ({ page }) => {
	await page.goto('/');
	const why = page.getByRole('link', { name: 'How it works' });
	await expect(why).toHaveAttribute('href', /why/);
	await page.goto('/why');
	await expect(page).toHaveURL(/\/why$/);
	await expect(page.getByText('No accounts, and not much kept.')).toBeVisible();
	await expect(page.getByText('github.com/Citylogic/shapshap')).toBeVisible();
});

test('dev grid preview is not a product route', async ({ page }) => {
	await page.goto('/dev/grid');
	await expect(page.getByText("That link doesn't work. Check you copied all of it.")).toBeVisible();
});
