import { expect, type Page } from '@playwright/test';

export async function fillSetup(page: Page, opts: { label?: string; weekends?: boolean } = {}) {
	await page.getByLabel('Meeting label').fill(opts.label ?? 'Q4 planning sync');
	if (opts.weekends) {
		await page.getByRole('switch', { name: 'Include weekends' }).click();
	}
}

export async function enterDisplayName(page: Page, first = 'Ada', last = 'Lovelace') {
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByLabel('First name').fill(first);
	await dialog.getByLabel('Last name').fill(last);
	await dialog.getByRole('button', { name: 'Continue →' }).click();
	await expect(dialog).toBeHidden();
}

export async function createMeeting(page: Page) {
	await page.goto('/');
	await fillSetup(page);
	await page.getByRole('button', { name: 'Generate shareable link →' }).click();
	await expect(page).toHaveURL(/\/m\/[A-Za-z0-9_-]{22}$/);
	await enterDisplayName(page);
}

/** Tap a respondent mark, then claim that row. No confirm dialog. */
export async function takeOverAs(page: Page, name: string) {
	await page.getByRole('button', { name, exact: true }).click();
	await page.getByRole('button', { name: 'This is me' }).click();
	await expect(page.getByRole('button', { name: 'This is me' })).toHaveCount(0);
}
