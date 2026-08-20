import { expect, type Page } from '@playwright/test';

/** Today's cell — in view on a phone, and not already expired. */
export async function pickDay(page: Page) {
	const now = new Date();
	const ymd = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, '0'),
		String(now.getDate()).padStart(2, '0')
	].join('-');
	const day = page.locator(`[data-date="${ymd}"]`);
	await day.scrollIntoViewIfNeeded();
	await day.click();
}

export async function createMeeting(page: Page) {
	await page.goto('/');
	await pickDay(page);
	await page.getByRole('button', { name: 'Times →' }).click();
	await page.getByRole('button', { name: 'Get the link →' }).click();
	await page.getByRole('button', { name: 'Add your times →' }).click();
	await expect(page).toHaveURL(/\/m\/[A-Za-z0-9_-]{22}$/);
}
