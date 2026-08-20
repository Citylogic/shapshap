import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '$lib/copy';
import {
	createBody,
	creatorTz,
	daySpan,
	DEFAULT_WINDOW_END,
	DEFAULT_WINDOW_START,
	hm,
	meetingHref,
	postMeeting,
	rangeError,
	SLOT_MINUTES,
	windowOk
} from './times';

describe('windowOk', () => {
	it('accepts the product default 08:00–20:00', () => {
		expect(windowOk(DEFAULT_WINDOW_START, DEFAULT_WINDOW_END)).toBe(true);
	});

	it('rejects equal or reversed windows, including seconds from time inputs', () => {
		expect(windowOk('08:00', '08:00')).toBe(false);
		expect(windowOk('20:00', '08:00')).toBe(false);
		expect(windowOk('08:00:00', '20:00:00')).toBe(true);
		expect(windowOk('not-a-time', '20:00')).toBe(false);
	});
});

describe('hm', () => {
	it('keeps HH:MM and strips seconds', () => {
		expect(hm('08:00')).toBe('08:00');
		expect(hm('20:00:00')).toBe('20:00');
	});
});

describe('daySpan / rangeError', () => {
	it('counts inclusive civil days and flags over 60', () => {
		expect(daySpan('2026-08-17', '2026-08-17')).toBe(1);
		expect(daySpan('2026-08-17', '2026-08-21')).toBe(5);
		expect(daySpan('2026-01-01', '2026-03-01')).toBe(60);
		expect(daySpan('2026-01-01', '2026-03-02')).toBe(61);
		expect(daySpan('2026-08-21', '2026-08-17')).toBeNull();
		expect(rangeError({ start: '2026-01-01', end: '2026-03-01' })).toBeNull();
		expect(rangeError({ start: '2026-01-01', end: '2026-03-02' })).toBe(COPY.over60);
	});
});

describe('createBody', () => {
	it('sends S09 days, HH:MM window, browser tz, and fixed 30-minute slots', () => {
		const body = createBody({ start: '2026-08-17', end: '2026-08-21' }, '08:00:00', '20:00:00');
		expect(body).toEqual({
			starts_on: '2026-08-17',
			ends_on: '2026-08-21',
			window_start: '08:00',
			window_end: '20:00',
			slot_minutes: SLOT_MINUTES,
			tz: creatorTz()
		});
		expect(body.slot_minutes).toBe(30);
	});
});

describe('meetingHref', () => {
	it('builds an absolute /m/{id} link', () => {
		expect(meetingHref('bo-8BXgyGW52K0Fa86o72A', 'https://shapshap.link')).toBe(
			'https://shapshap.link/m/bo-8BXgyGW52K0Fa86o72A'
		);
		expect(meetingHref('bo-8BXgyGW52K0Fa86o72A', 'http://localhost:4173/')).toBe(
			'http://localhost:4173/m/bo-8BXgyGW52K0Fa86o72A'
		);
	});
});

describe('postMeeting', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('does not POST a range over 60 days and returns §15.7 copy', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		const result = await postMeeting({ start: '2026-01-01', end: '2026-03-03' }, '08:00', '20:00');
		expect(result).toEqual({ ok: false, error: COPY.over60 });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('returns the server id on 201', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json({ id: 'bo-8BXgyGW52K0Fa86o72A' }, { status: 201 }))
		);
		const result = await postMeeting({ start: '2026-08-17', end: '2026-08-21' }, '08:00', '20:00');
		expect(result).toEqual({ ok: true, id: 'bo-8BXgyGW52K0Fa86o72A' });
	});

	it('surfaces rate-limit copy from the body', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json({ error: COPY.rateLimited }, { status: 429 }))
		);
		const result = await postMeeting({ start: '2026-08-17', end: '2026-08-21' }, '08:00', '20:00');
		expect(result).toEqual({ ok: false, error: COPY.rateLimited });
	});
});
