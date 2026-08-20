import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { isValidId, newId } from '../ids';
import { endSql, getSql } from './db';
import { COPY, createMeeting, getMeeting } from './meetings';
import { migrate } from './migrate';
import { rateLimit } from './rate-limit';
import { deleteResponse, putResponse } from './responses';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error('DATABASE_URL is required for pnpm test:int');
}

const BASE = {
	starts_on: '2026-08-17',
	ends_on: '2026-08-21',
	window_start: '08:00',
	window_end: '20:00',
	slot_minutes: 30 as const,
	tz: 'Africa/Johannesburg'
};

describe('PUT / DELETE responses', () => {
	beforeAll(async () => {
		await migrate(getSql());
	});

	beforeEach(async () => {
		rateLimit.reset();
		await getSql()`TRUNCATE meetings CASCADE`;
	});

	afterAll(async () => {
		await endSql();
	});

	it('upserts a client-generated participant id and replaces slots wholesale', async () => {
		const created = await createMeeting(BASE, '192.0.2.1');
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		const participantId = newId();
		expect(isValidId(participantId)).toBe(true);

		const first = await putResponse(
			created.body.id,
			participantId,
			{ name: 'Ada L', slots: [2, 0, 0, 1] },
			'192.0.2.1'
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		expect(first.status).toBe(200);
		expect(first.body.participant_id).toBe(participantId);
		expect(first.body.name).toBe('Ada L');
		expect(first.body.slots).toEqual([0, 1, 2]);

		const second = await putResponse(
			created.body.id,
			participantId,
			{ name: 'Ada L', slots: [5] },
			'192.0.2.1'
		);
		expect(second.ok).toBe(true);
		if (!second.ok) return;
		expect(second.body.slots).toEqual([5]);

		const got = await getMeeting(created.body.id, '192.0.2.1');
		expect(got.ok).toBe(true);
		if (!got.ok) return;
		expect(got.body.responses).toHaveLength(1);
		expect(got.body.responses[0]?.slots).toEqual([5]);
	});

	it('rejects email-like and phone-like names with §15.7 copy', async () => {
		const created = await createMeeting(BASE, '192.0.2.1');
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		const email = await putResponse(
			created.body.id,
			newId(),
			{ name: 'ada@example.com', slots: [0] },
			'192.0.2.1'
		);
		expect(email).toEqual({ ok: false, status: 400, body: { error: COPY.contact } });
		const phone = await putResponse(
			created.body.id,
			newId(),
			{ name: '0821234567', slots: [0] },
			'192.0.2.1'
		);
		expect(phone).toEqual({ ok: false, status: 400, body: { error: COPY.contact } });
	});

	it('rejects out-of-range slot indices with a bare 400', async () => {
		const created = await createMeeting(BASE, '192.0.2.1');
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		// 5 days × 24 half-hours = 120 slots; 120 is the first invalid index.
		const result = await putResponse(created.body.id, newId(), { slots: [0, 120] }, '192.0.2.1');
		expect(result).toEqual({ ok: false, status: 400 });
	});

	it('rejects a 51st participant with §15.7 copy and still allows an existing row to update', async () => {
		const created = await createMeeting(BASE, '192.0.2.1');
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		const ids: string[] = [];
		for (let i = 0; i < 50; i++) {
			const id = newId();
			ids.push(id);
			await getSql()`
				INSERT INTO responses (meeting_id, participant_id, name, slots)
				VALUES (${created.body.id}, ${id}, ${null}, ARRAY[0])
			`;
		}
		const extra = await putResponse(
			created.body.id,
			newId(),
			{ name: 'Nomsa D', slots: [1] },
			'192.0.2.1'
		);
		expect(extra).toEqual({ ok: false, status: 400, body: { error: COPY.full } });

		const update = await putResponse(
			created.body.id,
			ids[0]!,
			{ name: 'Ada L', slots: [3] },
			'192.0.2.1'
		);
		expect(update.ok).toBe(true);
		if (!update.ok) return;
		expect(update.body.slots).toEqual([3]);
	});

	it('rate-limits writes at 60 per minute per IP', async () => {
		const created = await createMeeting(BASE, '192.0.2.1');
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		const participantId = newId();
		for (let i = 0; i < 60; i++) {
			const r = await putResponse(created.body.id, participantId, { slots: [0] }, '198.51.100.9');
			expect(r.ok).toBe(true);
		}
		const denied = await putResponse(
			created.body.id,
			participantId,
			{ slots: [1] },
			'198.51.100.9'
		);
		expect(denied).toEqual({ ok: false, status: 429, body: { error: COPY.rateLimited } });
		const other = await putResponse(
			created.body.id,
			participantId,
			{ slots: [1] },
			'198.51.100.10'
		);
		expect(other.ok).toBe(true);
	});

	it('deletes a response row and is idempotent', async () => {
		const created = await createMeeting(BASE, '192.0.2.1');
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		const participantId = newId();
		const put = await putResponse(
			created.body.id,
			participantId,
			{ name: 'Ada L', slots: [0] },
			'192.0.2.1'
		);
		expect(put.ok).toBe(true);

		const del = await deleteResponse(created.body.id, participantId, '192.0.2.1');
		expect(del).toEqual({ ok: true, status: 204 });

		const got = await getMeeting(created.body.id, '192.0.2.1');
		expect(got.ok).toBe(true);
		if (!got.ok) return;
		expect(got.body.responses).toEqual([]);

		const again = await deleteResponse(created.body.id, participantId, '192.0.2.1');
		expect(again).toEqual({ ok: true, status: 204 });
	});

	it('rejects malformed ids before querying', async () => {
		const bad = await putResponse('short', newId(), { slots: [] }, '192.0.2.1');
		expect(bad).toEqual({ ok: false, status: 400 });
		const missing = await putResponse(newId(), newId(), { slots: [] }, '192.0.2.1');
		expect(missing).toEqual({ ok: false, status: 404, body: { error: COPY.notFound } });
	});
});
