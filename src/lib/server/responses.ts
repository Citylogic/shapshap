/**
 * Response upsert and delete. Meeting id is the only write barrier (PRD §6.6).
 * Participant ids are 22-char base64url; the client generates them with `newId()`
 * (same format as meeting ids). The server does not mint them.
 */

import * as v from 'valibot';
import { isValidId } from '../ids';
import { parseName } from '../name';
import { gridSize, type MeetingWindow, type SlotMinutes } from '../time';
import { COPY, type ApiEmpty, type ApiResult, type ResponseJson } from './meetings';
import { getSql } from './db';
import { ipBucketKey } from './ip';
import { rateLimit } from './rate-limit';

const MAX_PARTICIPANTS = 50;

const PutBody = v.object({
	name: v.optional(v.nullable(v.string())),
	slots: v.array(v.pipe(v.number(), v.integer()))
});

type MeetingWindowRow = {
	id: string;
	starts_on: string | Date;
	ends_on: string | Date;
	window_start: string;
	window_end: string;
	slot_minutes: number;
	include_weekends: boolean;
	tz: string;
};

type ResponseRow = {
	participant_id: string;
	name: string | null;
	slots: number[];
	updated_at: Date | string;
};

function hm(t: string): string {
	return t.slice(0, 5);
}

function ymd(value: string | Date): string {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return String(value).slice(0, 10);
}

function isoInstant(value: Date | string): string {
	if (value instanceof Date) return value.toISOString();
	return Temporal.Instant.from(value).toString();
}

function windowFrom(row: MeetingWindowRow): MeetingWindow {
	return {
		startsOn: ymd(row.starts_on),
		endsOn: ymd(row.ends_on),
		windowStart: hm(String(row.window_start)),
		windowEnd: hm(String(row.window_end)),
		tz: row.tz,
		slotMinutes: row.slot_minutes as SlotMinutes,
		includeWeekends: row.include_weekends
	};
}

function toResponse(row: ResponseRow): ResponseJson {
	return {
		participant_id: row.participant_id,
		name: row.name,
		slots: row.slots,
		updated_at: isoInstant(row.updated_at)
	};
}

/** In-bounds, unique, sorted. Null if any index is outside the meeting grid. */
export function normalizeSlots(slots: number[], slotCount: number): number[] | null {
	const seen = new Set<number>();
	for (const n of slots) {
		if (!Number.isInteger(n) || n < 0 || n >= slotCount) return null;
		seen.add(n);
	}
	return [...seen].sort((a, b) => a - b);
}

export async function putResponse(
	meetingId: string,
	participantId: string,
	raw: unknown,
	ip: string
): Promise<ApiResult<ResponseJson>> {
	if (!rateLimit.take('write', ipBucketKey(ip))) {
		return { ok: false, status: 429, body: { error: COPY.rateLimited } };
	}
	if (!isValidId(meetingId) || !isValidId(participantId)) {
		return { ok: false, status: 400 };
	}

	const parsed = v.safeParse(PutBody, raw);
	if (!parsed.success) return { ok: false, status: 400 };

	const nameParsed = parseName(parsed.output.name);
	if (!nameParsed.ok) {
		if (nameParsed.reason === 'contact') {
			return { ok: false, status: 400, body: { error: COPY.contact } };
		}
		return { ok: false, status: 400 };
	}

	const sql = getSql();
	return sql.begin(async (tx) => {
		const meetings = await tx<MeetingWindowRow[]>`
			SELECT id, starts_on, ends_on, window_start, window_end, slot_minutes, include_weekends, tz
			FROM meetings
			WHERE id = ${meetingId}
			FOR UPDATE
		`;
		const meeting = meetings[0];
		if (!meeting) return { ok: false, status: 404, body: { error: COPY.notFound } };

		const slots = normalizeSlots(parsed.output.slots, gridSize(windowFrom(meeting)).slotCount);
		if (!slots) return { ok: false, status: 400 };

		const existing = await tx<{ participant_id: string }[]>`
			SELECT participant_id
			FROM responses
			WHERE meeting_id = ${meetingId} AND participant_id = ${participantId}
		`;
		if (existing.length === 0) {
			const counts = await tx<{ n: number }[]>`
				SELECT count(*)::int AS n FROM responses WHERE meeting_id = ${meetingId}
			`;
			if ((counts[0]?.n ?? 0) >= MAX_PARTICIPANTS) {
				return { ok: false, status: 400, body: { error: COPY.full } };
			}
		}

		const rows = await tx<ResponseRow[]>`
			INSERT INTO responses (meeting_id, participant_id, name, slots)
			VALUES (${meetingId}, ${participantId}, ${nameParsed.name}, ${slots})
			ON CONFLICT (meeting_id, participant_id) DO UPDATE SET
				name = EXCLUDED.name,
				slots = EXCLUDED.slots,
				updated_at = now()
			RETURNING participant_id, name, slots, updated_at
		`;
		const row = rows[0];
		if (!row) return { ok: false, status: 400 };
		return { ok: true, status: 200 as const, body: toResponse(row) };
	});
}

export async function deleteResponse(
	meetingId: string,
	participantId: string,
	ip: string
): Promise<ApiEmpty> {
	if (!rateLimit.take('write', ipBucketKey(ip))) {
		return { ok: false, status: 429, body: { error: COPY.rateLimited } };
	}
	if (!isValidId(meetingId) || !isValidId(participantId)) {
		return { ok: false, status: 400 };
	}

	const sql = getSql();
	const meetings = await sql<{ id: string }[]>`
		SELECT id FROM meetings WHERE id = ${meetingId}
	`;
	if (!meetings[0]) return { ok: false, status: 404, body: { error: COPY.notFound } };

	await sql`
		DELETE FROM responses
		WHERE meeting_id = ${meetingId} AND participant_id = ${participantId}
	`;
	return { ok: true, status: 204 };
}

export async function listResponses(meetingId: string): Promise<ResponseJson[]> {
	if (!isValidId(meetingId)) return [];
	const sql = getSql();
	const rows = await sql<ResponseRow[]>`
		SELECT participant_id, name, slots, updated_at
		FROM responses
		WHERE meeting_id = ${meetingId}
	`;
	return rows.map(toResponse);
}
