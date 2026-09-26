import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { isValidId, newId } from '../ids';
import { gridSize } from '../time';
import { endSql, getSql } from './db';
import { COPY, createMeeting, getMeeting } from './meetings';
import { migrate } from './migrate';
import { rateLimit } from './rate-limit';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error('DATABASE_URL is required for pnpm test:int');
}

const BASE = {
	meeting_label: 'Standup',
	starts_on: '2026-08-17',
	ends_on: '2026-08-21',
	window_start: '08:00',
	window_end: '20:00',
	slot_minutes: 30 as const,
	include_weekends: false,
	tz: 'Africa/Johannesburg'
};

describe('POST create + GET meeting', () => {
	const sql = getSql();

	beforeAll(async () => {
		await migrate(sql);
	});

	beforeEach(async () => {
		rateLimit.reset();
		await sql`TRUNCATE meetings CASCADE`;
	});

	afterAll(async () => {
		await endSql();
	});

	it('creates a meeting with a server-generated 22-char id and returns it on GET', async () => {
		const created = await createMeeting(BASE, '192.0.2.1');
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect(created.status).toBe(201);
		expect(isValidId(created.body.id)).toBe(true);
		expect(created.body.starts_on).toBe('2026-08-17');
		expect(created.body.window_start).toBe('08:00');
		expect(created.body.slot_minutes).toBe(30);
		expect(created.body.meeting_label).toBe('Standup');
		expect(created.body).not.toHaveProperty('organisation');
		expect(created.body.include_weekends).toBe(false);

		const got = await getMeeting(created.body.id, '192.0.2.1');
		expect(got.ok).toBe(true);
		if (!got.ok) return;
		expect(got.body.meeting.id).toBe(created.body.id);
		expect(got.body.meeting.meeting_label).toBe('Standup');
		expect(got.body.meeting).not.toHaveProperty('organisation');
		expect(got.body.meeting.include_weekends).toBe(false);
		expect(got.body.responses).toEqual([]);

		const participantId = newId();
		await sql`
			INSERT INTO responses (meeting_id, participant_id, name, slots)
			VALUES (${created.body.id}, ${participantId}, ${'Ada L'}, ARRAY[0, 1])
		`;
		const withRows = await getMeeting(created.body.id, '192.0.2.1');
		expect(withRows.ok).toBe(true);
		if (!withRows.ok) return;
		expect(withRows.body.responses).toHaveLength(1);
		expect(withRows.body.responses[0]?.name).toBe('Ada L');
		expect(withRows.body.responses[0]?.slots).toEqual([0, 1]);
	});

	it('ignores client-supplied expires_at and caps at now + 90 days', async () => {
		const near = await createMeeting(BASE, '192.0.2.1');
		expect(near.ok).toBe(true);
		if (!near.ok) return;
		expect(near.body.expires_at).not.toContain('2099');

		const far = await createMeeting(
			{
				...BASE,
				starts_on: '2027-01-01',
				ends_on: '2027-01-07',
				expires_at: '2099-01-01T00:00:00Z'
			},
			'192.0.2.2'
		);
		expect(far.ok).toBe(true);
		if (!far.ok) return;
		const expires = Temporal.Instant.from(far.body.expires_at);
		const ceiling = Temporal.Now.instant().add({ hours: 90 * 24 });
		const delta = Math.abs(expires.epochMilliseconds - ceiling.epochMilliseconds);
		expect(delta).toBeLessThan(5_000);
	});

	it('rejects a range over 60 days with §15.7 copy', async () => {
		const result = await createMeeting(
			{ ...BASE, starts_on: '2026-01-01', ends_on: '2026-03-03' },
			'192.0.2.1'
		);
		expect(result).toEqual({ ok: false, status: 400, body: { error: COPY.over60 } });
	});

	it('rejects a bad window and a bad tz with a bare 400', async () => {
		const window = await createMeeting({ ...BASE, window_end: '07:00' }, '192.0.2.1');
		expect(window).toEqual({ ok: false, status: 400 });
		const tz = await createMeeting({ ...BASE, tz: 'Not/AZone' }, '192.0.2.1');
		expect(tz).toEqual({ ok: false, status: 400 });
	});

	it('rate-limits create at 5 per 10 minutes per IP', async () => {
		for (let i = 0; i < 5; i++) {
			const r = await createMeeting(BASE, '198.51.100.9');
			expect(r.ok).toBe(true);
		}
		const denied = await createMeeting(BASE, '198.51.100.9');
		expect(denied).toEqual({ ok: false, status: 429, body: { error: COPY.rateLimited } });
		const other = await createMeeting(BASE, '198.51.100.10');
		expect(other.ok).toBe(true);
	});

	it('rejects a malformed id before querying and a missing id with §15.7 copy', async () => {
		const bad = await getMeeting('short', '192.0.2.1');
		expect(bad).toEqual({ ok: false, status: 400 });
		const missing = await getMeeting(newId(), '192.0.2.1');
		expect(missing).toEqual({ ok: false, status: 404, body: { error: COPY.notFound } });
	});

	it('requires meeting_label and defaults the window', async () => {
		const emptyLabel = await createMeeting({ ...BASE, meeting_label: '  ' }, '192.0.2.1');
		expect(emptyLabel).toEqual({ ok: false, status: 400 });
		const withOrg = await createMeeting({ ...BASE, organisation: 'Citylogic' }, '192.0.2.1');
		expect(withOrg.ok).toBe(true);
		if (withOrg.ok) expect(withOrg.body).not.toHaveProperty('organisation');

		const created = await createMeeting(
			{
				meeting_label: BASE.meeting_label,
				starts_on: BASE.starts_on,
				ends_on: BASE.ends_on,
				include_weekends: BASE.include_weekends,
				tz: BASE.tz
			},
			'192.0.2.1'
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect(created.body.window_start).toBe('07:00');
		expect(created.body.window_end).toBe('17:30');
		expect(created.body.slot_minutes).toBe(30);
	});

	it('omits Saturday and Sunday from the grid when include_weekends is false', async () => {
		const off = await createMeeting(
			{ ...BASE, starts_on: '2026-08-17', ends_on: '2026-08-23', include_weekends: false },
			'192.0.2.1'
		);
		const on = await createMeeting(
			{ ...BASE, starts_on: '2026-08-17', ends_on: '2026-08-23', include_weekends: true },
			'192.0.2.2'
		);
		expect(off.ok).toBe(true);
		expect(on.ok).toBe(true);
		if (!off.ok || !on.ok) return;

		const offSize = gridSize({
			startsOn: off.body.starts_on,
			endsOn: off.body.ends_on,
			windowStart: off.body.window_start,
			windowEnd: off.body.window_end,
			tz: off.body.tz,
			slotMinutes: off.body.slot_minutes,
			includeWeekends: off.body.include_weekends
		});
		const onSize = gridSize({
			startsOn: on.body.starts_on,
			endsOn: on.body.ends_on,
			windowStart: on.body.window_start,
			windowEnd: on.body.window_end,
			tz: on.body.tz,
			slotMinutes: on.body.slot_minutes,
			includeWeekends: on.body.include_weekends
		});
		expect(offSize.days).toBe(5);
		expect(onSize.days).toBe(7);
		expect(offSize.slotCount).toBeLessThan(onSize.slotCount);
	});
});
