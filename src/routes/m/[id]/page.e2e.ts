import { expect, test, type Page } from '@playwright/test';

async function createMeeting(page: Page) {
	await page.goto('/');
	await page.locator('[data-date][data-in-month]').last().click();
	await page.getByRole('button', { name: 'Times →' }).click();
	await page.getByRole('button', { name: 'Get the link →' }).click();
	await page.getByRole('button', { name: 'Add your times →' }).click();
	await expect(page).toHaveURL(/\/m\/[A-Za-z0-9_-]{22}$/);
}

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

test('missing meeting shows the not-found line', async ({ page }) => {
	await page.goto('/m/aaaaaaaaaaaaaaaaaaaaaa');
	await expect(page.getByText("That link doesn't work. Check you copied all of it.")).toBeVisible();
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

test('This is me takes over a name without a confirm dialog', async ({ page, browser }) => {
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

	const other = await browser.newContext();
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
