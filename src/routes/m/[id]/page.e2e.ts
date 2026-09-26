import { expect, test, type Page } from '@playwright/test';
import { createMeeting, enterDisplayName, fillSetup, takeOverAs } from '../../../../e2e/flow';

test('announcement strip opens a new shapshap in another window', async ({ page }) => {
	await createMeeting(page);
	const create = page.getByRole('link', { name: 'New Shapshap.link' });
	await expect(create).toBeVisible();
	await expect(create).toHaveAttribute('target', '_blank');

	const popupPromise = page.waitForEvent('popup');
	await create.click();
	const popup = await popupPromise;
	await expect(popup.getByRole('heading', { name: 'Find a time that works' })).toBeVisible();
	await expect(popup).not.toHaveURL(/\/m\//);
	await popup.close();
});

test('SSR grid paints and autosaves without a Submit button', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (err) => pageErrors.push(err.message));

	await createMeeting(page);
	await expect.poll(() => page.evaluate(() => 'Temporal' in globalThis)).toBe(true);
	expect(pageErrors.filter((m) => /Temporal/i.test(m))).toEqual([]);
	await expect(page.getByRole('heading', { name: 'When are you free?' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Ada Lovelace' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
	await expect(page.locator('[data-slot="0"]')).toBeVisible();

	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	await put;
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();
});

test('Clear drops only that day and autosaves', async ({ page }) => {
	await createMeeting(page);
	const cell = page.locator('[data-slot="0"]');
	const painted = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await cell.click();
	await painted;
	await expect(cell).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByText('0.5 hrs selected').first()).toBeVisible();

	const cleared = page.waitForRequest((req) => {
		if (req.method() !== 'PUT' || !/\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())) return false;
		const body: unknown = req.postDataJSON();
		return (
			!!body &&
			typeof body === 'object' &&
			'slots' in body &&
			Array.isArray(body.slots) &&
			!body.slots.includes(0)
		);
	});
	await page
		.getByRole('group')
		.filter({ has: page.locator('[data-slot="0"]') })
		.getByRole('button', { name: 'Clear' })
		.click();
	await cleared;
	await expect(cell).toHaveAttribute('aria-selected', 'false');
	await expect(page.getByText('0 hrs selected').first()).toBeVisible();
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();
});

test('new visitor is gated by the entry modal until first and last name', async ({ page }) => {
	await page.goto('/');
	await fillSetup(page);
	await page.getByRole('button', { name: 'Generate shareable link →' }).click();
	await expect(page).toHaveURL(/\/m\/[A-Za-z0-9_-]{22}$/);

	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('heading', { name: 'When are you free?' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Continue →' })).toBeDisabled();
	await page.getByLabel('First name').fill('Ada');
	await expect(page.getByRole('button', { name: 'Continue →' })).toBeDisabled();
	await page.getByLabel('Last name').fill('Lovelace');
	await expect(page.getByRole('button', { name: 'Continue →' })).toBeEnabled();

	const put = page.waitForRequest((req) => {
		if (req.method() !== 'PUT' || !/\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())) return false;
		const body: unknown = req.postDataJSON();
		return !!body && typeof body === 'object' && 'name' in body && body.name === 'Ada Lovelace';
	});
	await page.getByRole('button', { name: 'Continue →' }).click();
	await expect(dialog).toBeHidden();
	await page.locator('[data-slot="0"]').click();
	await put;
});

test('return visit with a saved name skips the entry modal', async ({ page }) => {
	await createMeeting(page);
	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	await put;
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();

	await page.reload();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Ada Lovelace' })).toBeVisible();
});

test('own avatar opens the name dialog to edit', async ({ page }) => {
	await createMeeting(page);
	await page.getByRole('button', { name: 'Ada Lovelace' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByRole('heading', { name: 'Your name' })).toBeVisible();
	await expect(dialog.getByLabel('First name')).toHaveValue('Ada');
	await expect(dialog.getByLabel('Last name')).toHaveValue('Lovelace');

	const put = page.waitForRequest((req) => {
		if (req.method() !== 'PUT' || !/\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())) return false;
		const body: unknown = req.postDataJSON();
		return !!body && typeof body === 'object' && 'name' in body && body.name === 'Ada L';
	});
	await dialog.getByLabel('Last name').fill('L');
	await dialog.getByRole('button', { name: 'Save →' }).click();
	await expect(dialog).toBeHidden();
	await put;
	await expect(page.getByRole('button', { name: 'Ada L' })).toBeVisible();
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
	await enterDisplayName(otherPage, 'Bea', 'Miller');
	await expect(otherPage.getByRole('button', { name: 'Ada Lovelace' })).toBeVisible();
	await takeOverAs(otherPage, 'Ada Lovelace');
	await expect(otherPage.getByRole('dialog')).toHaveCount(0);
	await expect(otherPage.getByRole('button', { name: 'Ada Lovelace' })).toBeVisible();
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
		await enterDisplayName(page);
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
		await enterDisplayName(page);
		const select = page.getByLabel('Time zone');
		await expect(select).toBeVisible();
		await expect(select).toHaveValue('America/Los_Angeles');
		await expect(page.locator('[data-slot="0"]')).toContainText('23:00');
		await select.selectOption('Europe/London');
		await expect(page.locator('[data-slot="0"]')).toContainText('07:00');
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
	await enterDisplayName(otherPage, 'Bea', 'Miller');
	const cell = otherPage.locator('[data-slot="0"]');
	await expect(cell).toHaveAttribute('data-density', /[1-4]/);
	await expect(otherPage.getByText('2 RESPONDENTS')).toBeVisible();
	await expect(otherPage.getByRole('button', { name: 'Ada Lovelace' })).toBeVisible();
	await expect(otherPage.getByRole('button', { name: 'Bea Miller' })).toBeVisible();
	await other.close();
});

test('second visitor sees live density after the first paints', async ({
	page,
	browser
}, testInfo) => {
	await createMeeting(page);
	const url = page.url();

	const other = await browser.newContext(testInfo.project.use);
	const otherPage = await other.newPage();
	await otherPage.goto(url);
	await enterDisplayName(otherPage, 'Bea', 'Miller');
	await expect(otherPage.getByText('1 RESPONDENT')).toBeVisible();
	const cell = otherPage.locator('[data-slot="0"]');
	await expect(cell).not.toHaveAttribute('data-density');

	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	await put;
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();

	await expect(cell).toHaveAttribute('data-density', /[1-4]/);
	await expect(otherPage.getByText('2 RESPONDENTS')).toBeVisible();
	await other.close();
});

test('expired meeting shows the gone page', async ({ page }) => {
	const res = await page.request.post('/api/m', {
		data: {
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

async function assertNoWeekendColumns(page: Page) {
	const next = page.getByRole('button', { name: 'Next days' });
	const first = page.getByRole('button', { name: 'First days' });
	if (await first.isEnabled()) await first.click();
	for (;;) {
		await expect(page.getByRole('group', { name: /^Saturday / })).toHaveCount(0);
		await expect(page.getByRole('group', { name: /^Sunday / })).toHaveCount(0);
		if (await next.isDisabled()) break;
		await next.click();
	}
}

test('weekends-off meeting has no Saturday or Sunday columns', async ({ page }) => {
	await page.goto('/');
	await fillSetup(page);
	await page.getByRole('button', { name: 'Generate shareable link →' }).click();
	await expect(page).toHaveURL(/\/m\/[A-Za-z0-9_-]{22}$/);
	await enterDisplayName(page);
	await assertNoWeekendColumns(page);
});
