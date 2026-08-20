import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createMeeting } from '../../e2e/flow';

const LOG_PATH = 'test-results/e2e-server.log';

function meetingIdFrom(url: string): string {
	const id = url.match(/\/m\/([A-Za-z0-9_-]{22})$/)?.[1];
	if (!id) throw new Error('expected a meeting URL');
	return id;
}

test('generic OG tags on home and meeting pages', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'shapshap');
	await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
		'content',
		'pick your times'
	);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\.svg$/);

	await createMeeting(page);
	await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'shapshap');
	await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
		'content',
		'pick your times'
	);
	const desc = await page.locator('meta[property="og:description"]').getAttribute('content');
	expect(desc).not.toMatch(/\d{4}-\d{2}-\d{2}/);
});

test('CSP and Referrer-Policy on the app; HSTS is Caddy in prod', async ({ page }) => {
	const res = await page.goto('/');
	expect(res).not.toBeNull();
	const headers = res!.headers();
	expect(
		headers['content-security-policy'] || headers['content-security-policy-report-only']
	).toBeTruthy();
	expect(headers['referrer-policy']).toBe('no-referrer');
	expect(headers['x-powered-by']).toBeFalsy();
	expect(headers['server']).toBeFalsy();
});

test('meeting id is absent from server logs after create-and-respond', async ({ page }) => {
	await createMeeting(page);
	const id = meetingIdFrom(page.url());
	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	const req = await put;
	const participant = req.url().match(/\/r\/([A-Za-z0-9_-]{22})/)?.[1];
	await expect(page.getByText('Shap', { exact: true })).toBeVisible();

	expect(existsSync(LOG_PATH)).toBe(true);
	const log = readFileSync(LOG_PATH, 'utf8');
	if (log.includes(id)) throw new Error('meeting id found in server logs');
	if (participant && log.includes(participant))
		throw new Error('participant id found in server logs');
});

test('meeting id does not leave the origin', async ({ page }) => {
	const foreign: string[] = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		const here = page.url();
		if (here && here !== 'about:blank') {
			try {
				if (new URL(req.url()).origin !== new URL(here).origin) {
					foreign.push(`${req.url()}\n${JSON.stringify(req.headers())}\n${req.postData() ?? ''}`);
				}
			} catch {
				foreign.push(req.url());
			}
		}
		await route.continue();
	});

	await createMeeting(page);
	const id = meetingIdFrom(page.url());
	const put = page.waitForRequest(
		(req) => req.method() === 'PUT' && /\/api\/m\/[A-Za-z0-9_-]{22}\/r\//.test(req.url())
	);
	await page.locator('[data-slot="0"]').click();
	await put;

	for (const blob of foreign) {
		if (blob.includes(id)) throw new Error('meeting id left the origin');
	}
});
