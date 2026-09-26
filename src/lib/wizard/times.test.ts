import { afterEach, describe, expect, it, vi } from 'vitest';
import { deviceTz } from '$lib/civil';
import { COPY } from '$lib/copy';
import {
	createBody,
	daySpan,
	defaultRange,
	formReady,
	LABEL_MAX,
	meetingHref,
	postMeeting,
	rangeError
} from './times';

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

describe('defaultRange', () => {
	it('spans today through seven days later', () => {
		expect(defaultRange(Temporal.PlainDate.from('2026-08-21'))).toEqual({
			start: '2026-08-21',
			end: '2026-08-28'
		});
	});
});

describe('formReady', () => {
	it('requires a label and a valid range of at most 60 days', () => {
		const range = { start: '2026-08-17', end: '2026-08-21' };
		expect(formReady('', range)).toBe(false);
		expect(formReady('Standup', null)).toBe(false);
		expect(formReady('Standup', { start: '2026-08-21', end: '2026-08-17' })).toBe(false);
		expect(formReady('Standup', { start: '2026-01-01', end: '2026-03-02' })).toBe(false);
		expect(formReady('  Standup  ', range)).toBe(true);
	});
});

describe('createBody', () => {
	it('sends label, days, weekends, and tz, and omits the window', () => {
		const body = createBody('Standup', { start: '2026-08-17', end: '2026-08-21' }, true);
		expect(body).toEqual({
			meeting_label: 'Standup',
			starts_on: '2026-08-17',
			ends_on: '2026-08-21',
			include_weekends: true,
			tz: deviceTz()
		});
		expect(body).not.toHaveProperty('organisation');
		expect(body).not.toHaveProperty('window_start');
		expect(body).not.toHaveProperty('window_end');
		expect(body).not.toHaveProperty('slot_minutes');
		expect(LABEL_MAX).toBe(80);
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
		const result = await postMeeting(
			'Standup',
			{
				start: '2026-01-01',
				end: '2026-03-03'
			},
			false
		);
		expect(result).toEqual({ ok: false, error: COPY.over60 });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('returns the server id on 201', async () => {
		let posted: unknown;
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url: string, init?: RequestInit) => {
				posted = JSON.parse(String(init?.body));
				return Response.json({ id: 'bo-8BXgyGW52K0Fa86o72A' }, { status: 201 });
			})
		);
		const result = await postMeeting('Standup', { start: '2026-08-17', end: '2026-08-21' }, false);
		expect(result).toEqual({ ok: true, id: 'bo-8BXgyGW52K0Fa86o72A' });
		expect(posted).toMatchObject({
			meeting_label: 'Standup',
			include_weekends: false
		});
		expect(posted).not.toHaveProperty('organisation');
		expect(posted).not.toHaveProperty('window_start');
	});

	it('surfaces rate-limit copy from the body', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json({ error: COPY.rateLimited }, { status: 429 }))
		);
		const result = await postMeeting('Standup', { start: '2026-08-17', end: '2026-08-21' }, false);
		expect(result).toEqual({ ok: false, error: COPY.rateLimited });
	});
});
