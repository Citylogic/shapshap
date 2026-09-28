import { expect, test } from '@playwright/test';
import { formatDayLong } from '../lib/civil';
import { createMeeting, enterDisplayName, fillSetup } from '../../e2e/flow';

const LINK_RE = /\/m\/[A-Za-z0-9_-]{22}$/;

test('home is the Setup form', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('SHAPSHAP', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Find a time that works' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Create your link' })).toBeVisible();
	await expect(page.getByLabel('Organisation / Company')).toHaveCount(0);
	await expect(page.getByLabel('Label')).toBeVisible();
	await expect(page.getByRole('button', { name: /^Date Range\b/ })).toBeVisible();
	await expect(page.getByLabel('Start date')).toHaveCount(0);
	await expect(page.getByLabel('End date')).toHaveCount(0);
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

test('a date range is chosen with two clicks in one calendar', async ({ page }) => {
	await page.goto('/');
	const field = page.getByRole('button', { name: /^Date Range\b/ });
	await field.click();
	const dialog = page.getByRole('dialog', { name: 'Choose dates' });
	await expect(dialog).toBeVisible();
	const days = dialog.getByRole('gridcell');
	await days.nth(8).click();
	await expect(dialog).toBeVisible();
	await days.nth(12).click();
	await expect(dialog).toBeHidden();
	await expect(field).toBeVisible();
});

test('a weekday-only range hides the weekend switch', async ({ page }) => {
	await page.goto('/');
	const now = new Date();
	const year = now.getFullYear();
	const monthIndex = now.getMonth();
	const first = new Date(year, monthIndex, 1);
	const mondayDay = 1 + ((8 - first.getDay()) % 7);
	const iso = (day: number) =>
		`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

	await page.getByRole('button', { name: /^Date Range\b/ }).click();
	const dialog = page.getByRole('dialog', { name: 'Choose dates' });
	await dialog.getByRole('gridcell', { name: formatDayLong(iso(mondayDay)) }).click();
	await dialog.getByRole('gridcell', { name: formatDayLong(iso(mondayDay + 4)) }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('switch', { name: 'Include weekends' })).toHaveCount(0);
});

test('cannot generate until the meeting label is filled', async ({ page }) => {
	await page.goto('/');
	const go = page.getByRole('button', { name: 'Generate shareable link →' });
	await expect(go).toBeDisabled();
	await page.getByLabel('Label').fill('Standup');
	await expect(go).toBeEnabled();
});

test('generate lands on the meeting with a copyable link', async ({ page }) => {
	await page.goto('/');
	await fillSetup(page, { weekends: true });
	await page.getByRole('button', { name: 'Generate shareable link →' }).click();
	await expect(page).toHaveURL(LINK_RE);
	await enterDisplayName(page);

	const copy = page.getByRole('button', { name: 'Copy link' });
	await expect(copy).toBeVisible();
	await copy.click();
	await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
});

test('createMeeting helper reaches a named grid', async ({ page }) => {
	await createMeeting(page);
	await expect(page.getByRole('button', { name: 'Ada Lovelace' })).toBeVisible();
	await expect(page.locator('[data-slot="0"]')).toBeVisible();
});

test('How it works is an honest document', async ({ page }) => {
	await page.goto('/why');
	await expect(page).toHaveTitle('How it works · shapshap');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/why$/);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		'content',
		'No accounts, and not much kept.'
	);
	await expect(page.getByText('No accounts, and not much kept.')).toBeVisible();
	await expect(page.getByText('We can read that.')).toBeVisible();
	await expect(page.getByText('We do not log names or meeting label.')).toBeVisible();
	await expect(page.getByText('github.com/Citylogic/shapshap')).toBeVisible();
	await expect(page.getByText('Welcome')).toHaveCount(0);
	await expect(page.getByText(/encrypted/i)).toHaveCount(0);
	await expect(page.getByRole('dialog')).toHaveCount(0);

	await page.getByRole('link', { name: 'How it works' }).click();
	await expect(page).toHaveURL(/\/why$/);
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('How it works opens in a dialog from other pages', async ({ page }) => {
	await page.goto('/');
	const why = page.getByRole('link', { name: 'How it works' }).first();
	await expect(why).toHaveAttribute('href', /why/);
	await why.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
	await expect(page).toHaveTitle('shapshap');
	await expect(dialog.getByText('No accounts, and not much kept.')).toBeVisible();
	await expect(dialog.getByText('We can read that.')).toBeVisible();
	await expect(dialog.getByText('We do not log names or meeting label.')).toBeVisible();
	await expect(dialog.getByText('github.com/Citylogic/shapshap')).toBeVisible();
	await expect(page.getByText('Welcome')).toHaveCount(0);
	await expect(page.getByText(/encrypted/i)).toHaveCount(0);
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
});

test('Terms and Privacy pages are honest documents', async ({ page }) => {
	await page.goto('/terms');
	await expect(page).toHaveTitle('Terms & Conditions · shapshap');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/terms$/);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		'content',
		/A meeting is a link/
	);
	await expect(page.getByRole('heading', { name: 'Terms & Conditions' })).toBeVisible();
	await expect(page.getByText('A meeting is a link.')).toBeVisible();
	await expect(page.getByText('We can read that.')).toBeVisible();
	await expect(page.getByText(/encrypted/i)).toHaveCount(0);
	await expect(page.getByRole('dialog')).toHaveCount(0);

	await page.goto('/privacy');
	await expect(page).toHaveTitle('Privacy Policy · shapshap');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/privacy$/);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		'content',
		/We never ask for an email address/
	);
	await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
	await expect(
		page.getByText('We never ask for an email address, and there is no account.')
	).toBeVisible();
	await expect(page.getByText('We do not log names or meeting label.')).toBeVisible();
	await expect(page.getByText(/encrypted/i)).toHaveCount(0);
});

test('Terms and Privacy open in a dialog from other pages', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('shapshap');
	const terms = page.getByRole('link', { name: 'Terms & Conditions' }).first();
	const privacy = page.getByRole('link', { name: 'Privacy Policy' }).first();
	await expect(terms).toHaveAttribute('href', /\/terms$/);
	await expect(privacy).toHaveAttribute('href', /\/privacy$/);

	await terms.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
	await expect(page).toHaveTitle('shapshap');
	await expect(dialog.getByRole('heading', { name: 'Terms & Conditions' })).toBeVisible();
	await expect(dialog.getByText('A meeting is a link.')).toBeVisible();
	await expect(dialog.getByText('We can read that.')).toBeVisible();
	await expect(page.getByText(/encrypted/i)).toHaveCount(0);

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(page).toHaveURL(/\/$/);

	await privacy.click();
	await expect(dialog).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
	await expect(dialog.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
	await expect(
		dialog.getByText('We never ask for an email address, and there is no account.')
	).toBeVisible();
	await expect(dialog.getByText('We do not log names or meeting label.')).toBeVisible();
	await dialog.getByRole('button', { name: 'Close' }).click();
	await expect(dialog).toBeHidden();

	await page.goto('/terms');
	await page.getByRole('link', { name: 'Privacy Policy' }).click();
	await expect(page).toHaveURL(/\/terms$/);
	await expect(dialog.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Terms & Conditions' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();

	await page.getByRole('link', { name: 'Terms & Conditions' }).click();
	await expect(page).toHaveURL(/\/terms$/);
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('dev grid preview is not a product route', async ({ page }) => {
	await page.goto('/dev/grid');
	await expect(page.getByText("That link doesn't work. Check you copied all of it.")).toBeVisible();
});
