import { expect, type Page } from '@playwright/test';

export async function fillSetup(
	page: Page,
	opts: { org?: string; label?: string; weekends?: boolean } = {}
) {
	await page.getByLabel('Organisation / Company').fill(opts.org ?? 'ABC Organisation');
	await page.getByLabel('Meeting label').fill(opts.label ?? 'Q4 planning sync');
	if (opts.weekends) {
		await page.getByRole('switch', { name: 'Include weekends' }).click();
	}
}

export async function enterDisplayName(page: Page, name = 'Ada Lovelace') {
	await page.getByPlaceholder(/^Guest /).fill(name);
}

export async function createMeeting(page: Page) {
	await page.goto('/');
	await fillSetup(page);
	await page.getByRole('button', { name: 'Generate shareable link →' }).click();
	await expect(page).toHaveURL(/\/m\/[A-Za-z0-9_-]{22}$/);
	await enterDisplayName(page);
}
