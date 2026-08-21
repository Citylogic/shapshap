import { expect, test, type Page } from '@playwright/test';
import { createMeeting } from '../../../../e2e/flow';

test('SSR grid paints and autosaves without a Submit button', async ({ page }) => {
	await createMeeting(page);
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

test('malformed meeting link shows the not-found line', async ({ page }) => {
	await page.goto('/m/not-a-real-link');
	await expect(page.getByText("That link doesn't work. Check you copied all of it.")).toBeVisible();
});

test('deleted meeting shows the gone page', async ({ page }) => {
	await page.goto('/m/aaaaaaaaaaaaaaaaaaaaaa');
	await expect(page.getByRole('heading', { name: "This one's gone." })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Start a new one →' })).toBeVisible();
});

test('reload restores the painted response', async ({ page }) => {
	await createMeeting(page);
	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	await put;
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();

	await page.reload();
	await expect(page.locator('[data-slot="0"]')).toHaveAttribute('aria-selected', 'true');
});

test('This is me takes over a name without a confirm dialog', async ({
	page,
	browser
}, testInfo) => {
	await createMeeting(page);
	await page.getByPlaceholder(/^Guest /).fill('Ada L');
	const put = page.waitForRequest((req) => {
		if (req.method() !== 'PUT' || !/\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())) return false;
		const body: unknown = req.postDataJSON();
		return (
			!!body &&
			typeof body === 'object' &&
			'slots' in body &&
			Array.isArray(body.slots) &&
			body.slots.includes(0)
		);
	});
	await page.locator('[data-slot="0"]').click();
	await put;
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();
	const url = page.url();

	const other = await browser.newContext(testInfo.project.use);
	const otherPage = await other.newPage();
	await otherPage.goto(url);
	await otherPage.getByRole('button', { name: /people$/ }).click();
	await otherPage.getByRole('button', { name: 'Ada L' }).click();
	await otherPage.getByRole('button', { name: 'This is me' }).click();
	await expect(otherPage.getByRole('dialog')).toHaveCount(0);
	await expect(otherPage.getByRole('button', { name: 'This is me' })).toHaveCount(0);
	await expect(otherPage.getByRole('textbox')).toHaveValue('Ada L');
	await expect(otherPage.locator('[data-slot="0"]')).toHaveAttribute('aria-selected', 'true');
	await other.close();
});

async function postMeeting(page: Page, tz: string) {
	const start = new Date();
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 4);
	const ymd = (d: Date) => d.toISOString().slice(0, 10);
	const res = await page.request.post('/api/m', {
		data: {
			organisation: 'Citylogic',
			meeting_label: 'Standup',
			starts_on: ymd(start),
			ends_on: ymd(end),
			window_start: '08:00',
			window_end: '20:00',
			slot_minutes: 30,
			include_weekends: false,
			tz
		}
	});
	expect(res.ok()).toBeTruthy();
	const body: unknown = await res.json();
	if (!body || typeof body !== 'object' || !('id' in body) || typeof body.id !== 'string') {
		throw new Error('create failed');
	}
	return body.id;
}

test.describe('matching viewer zone', () => {
	test.use({ timezoneId: 'Africa/Johannesburg' });

	test('hides the zone label', async ({ page, browserName }) => {
		test.skip(browserName === 'webkit', 'WebKit does not emulate timezoneId');
		const id = await postMeeting(page, 'Africa/Johannesburg');
		await page.goto(`/m/${id}`);
		await page.locator('[data-slot="0"]').scrollIntoViewIfNeeded();
		await expect(page.locator('[data-slot="0"]')).toBeVisible();
		await expect(page.getByLabel('Time zone')).toHaveCount(0);
	});
});

test.describe('mismatched viewer zone', () => {
	test.use({ timezoneId: 'America/Los_Angeles' });

	test('shows a changeable zone label and updates grid times', async ({ page, browserName }) => {
		test.skip(browserName === 'webkit', 'WebKit does not emulate timezoneId');
		const id = await postMeeting(page, 'Africa/Johannesburg');
		await page.goto(`/m/${id}`);
		const select = page.getByLabel('Time zone');
		await expect(select).toBeVisible();
		await expect(select).toHaveValue('America/Los_Angeles');
		await expect(page.getByRole('rowheader', { name: '23:00' })).toBeVisible();
		await select.selectOption('Europe/London');
		await expect(page.getByRole('rowheader', { name: '07:00' })).toBeVisible();
	});
});

test('second visitor sees overlap after copy-link and paint', async ({
	page,
	browser
}, testInfo) => {
	await createMeeting(page);
	await page.getByRole('button', { name: 'Copy link' }).click();
	await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();

	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	await put;
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();
	const url = page.url();

	const other = await browser.newContext(testInfo.project.use);
	const otherPage = await other.newPage();
	await otherPage.goto(url);
	const cell = otherPage.locator('[data-slot="0"]');
	await expect(cell).toHaveAttribute('data-best', '');
	await expect(cell).toHaveAttribute('data-density', /[1-4]/);
	await expect(otherPage.getByRole('button', { name: /people$/ })).toHaveText('1 people');
	await other.close();
});

test('a second open tab sees paint without reload', async ({ page, browser }, testInfo) => {
	await createMeeting(page);
	const url = page.url();

	const other = await browser.newContext(testInfo.project.use);
	const otherPage = await other.newPage();
	const live = otherPage.waitForResponse(
		(res) => /\/api\/m\/[A-Za-z0-9_-]{22}\/live$/.test(res.url()) && res.ok()
	);
	await otherPage.goto(url);
	await live;
	await expect(otherPage.locator('[data-slot="0"]')).toBeVisible();

	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	await put;

	await expect(otherPage.getByRole('button', { name: /people$/ })).toHaveText('1 people');
	await expect(otherPage.locator('[data-slot="0"]')).toHaveAttribute('data-density', /[1-4]/);
	await other.close();
});

test('expired meeting shows the gone page', async ({ page }) => {
	const res = await page.request.post('/api/m', {
		data: {
			organisation: 'Citylogic',
			meeting_label: 'Standup',
			starts_on: '2020-01-06',
			ends_on: '2020-01-10',
			include_weekends: false,
			tz: 'Africa/Johannesburg'
		}
	});
	expect(res.ok()).toBeTruthy();
	const body: unknown = await res.json();
	if (!body || typeof body !== 'object' || !('id' in body) || typeof body.id !== 'string') {
		throw new Error('create failed');
	}
	await page.goto(`/m/${body.id}`);
	await expect(page.getByRole('heading', { name: "This one's gone." })).toBeVisible();
	await expect(
		page.getByText('Meetings are deleted 24 hours after the last time slot.')
	).toBeVisible();
	await expect(page.getByText("There's no archive and no copy.")).toBeVisible();
	await expect(page.getByRole('link', { name: 'Start a new one →' })).toBeVisible();
	await expect(page.getByRole('heading', { name: /expired/i })).toHaveCount(0);
});
