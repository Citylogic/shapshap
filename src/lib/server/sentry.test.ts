import { describe, expect, it } from 'vitest';
import { newId } from '$lib/ids';
import { initSentry, scrubSentryEvent } from './sentry';

describe('initSentry', () => {
	it('does not throw when SENTRY_DSN is unset', () => {
		const prev = process.env.SENTRY_DSN;
		delete process.env.SENTRY_DSN;
		expect(() => initSentry()).not.toThrow();
		if (prev == null) delete process.env.SENTRY_DSN;
		else process.env.SENTRY_DSN = prev;
	});
});

describe('scrubSentryEvent', () => {
	it('scrubs URLs, breadcrumbs, and frames', () => {
		const meeting = newId();
		const event = scrubSentryEvent({
			request: { url: `https://shapshap.link/m/${meeting}` },
			transaction: `/m/${meeting}`,
			exception: {
				values: [
					{
						value: `failed GET /m/${meeting}`,
						stacktrace: {
							frames: [{ filename: `/app/m/${meeting}/page.js`, abs_path: `/m/${meeting}` }]
						}
					}
				]
			},
			breadcrumbs: [{ message: `GET /m/${meeting}`, data: { url: `/api/m/${meeting}` } }],
			user: { ip_address: '203.0.113.9', id: meeting }
		});
		const text = JSON.stringify(event);
		expect(text).not.toContain(meeting);
		expect(text).not.toContain('203.0.113.9');
		expect(event.request?.url).toBe('https://shapshap.link/m/[id]');
		expect(event.breadcrumbs?.[0]?.message).toBe('GET /m/[id]');
		expect(event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe(
			'/app/m/[id]/page.js'
		);
	});
});
