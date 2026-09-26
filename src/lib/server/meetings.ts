/**
 * Meeting create/get. Caps from TECH-STACK §4.1; user-facing copy from PRD §15.7.
 * `expires_at` is computed here — the client cannot set it (PRD §9).
 */

import * as v from 'valibot';
import { COPY } from '../copy';
import { isValidId, newId } from '../ids';
import { expiresAt, type SlotMinutes } from '../time';
import { getSql } from './db';
import { ipBucketKey } from './ip';
import { rateLimit } from './rate-limit';

export { COPY };

const MAX_DAYS = 60;
const EXPIRY_CEILING_HOURS = 90 * 24;
const IANA = new Set(Intl.supportedValuesOf('timeZone'));
export const LABEL_MAX = 80;
const DEFAULT_WINDOW_START = '07:00';
const DEFAULT_WINDOW_END = '17:30';

const CreateBody = v.object({
	meeting_label: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(LABEL_MAX)),
	starts_on: v.pipe(v.string(), v.isoDate()),
	ends_on: v.pipe(v.string(), v.isoDate()),
	window_start: v.optional(v.pipe(v.string(), v.isoTime()), DEFAULT_WINDOW_START),
	window_end: v.optional(v.pipe(v.string(), v.isoTime()), DEFAULT_WINDOW_END),
	slot_minutes: v.optional(v.picklist([15, 30, 60]), 30),
	include_weekends: v.boolean(),
	tz: v.pipe(
		v.string(),
		v.check((tz) => IANA.has(tz))
	)
});

export type MeetingJson = {
	id: string;
	meeting_label: string;
	starts_on: string;
	ends_on: string;
	window_start: string;
	window_end: string;
	slot_minutes: SlotMinutes;
	include_weekends: boolean;
	tz: string;
	created_at: string;
	expires_at: string;
};

export type ResponseJson = {
	participant_id: string;
	name: string | null;
	slots: number[];
	updated_at: string;
};

export type GetBody = {
	meeting: MeetingJson;
	responses: ResponseJson[];
};

export type ApiErr =
	| { ok: false; status: 400; body?: { error: string } }
	| { ok: false; status: 404 | 429; body: { error: string } };

export type ApiResult<T> = { ok: true; status: 200 | 201; body: T } | ApiErr;

export type ApiEmpty = { ok: true; status: 204 } | ApiErr;

type MeetingRow = {
	id: string;
	meeting_label: string;
	starts_on: string | Date;
	ends_on: string | Date;
	window_start: string;
	window_end: string;
	slot_minutes: number;
	include_weekends: boolean;
	tz: string;
	created_at: Date | string;
	expires_at: Date | string;
};

function hm(t: string): string {
	return t.slice(0, 5);
}

function isoInstant(value: Date | string): string {
	if (value instanceof Date) return value.toISOString();
	return Temporal.Instant.from(value).toString();
}

function ymd(value: string | Date): string {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return String(value).slice(0, 10);
}

function toMeeting(row: MeetingRow): MeetingJson {
	return {
		id: row.id,
		meeting_label: row.meeting_label,
		starts_on: ymd(row.starts_on),
		ends_on: ymd(row.ends_on),
		window_start: hm(String(row.window_start)),
		window_end: hm(String(row.window_end)),
		slot_minutes: row.slot_minutes as SlotMinutes,
		include_weekends: row.include_weekends,
		tz: row.tz,
		created_at: isoInstant(row.created_at),
		expires_at: isoInstant(row.expires_at)
	};
}

function dayCount(startsOn: string, endsOn: string): number | null {
	try {
		const start = Temporal.PlainDate.from(startsOn);
		const end = Temporal.PlainDate.from(endsOn);
		if (Temporal.PlainDate.compare(end, start) < 0) return null;
		return start.until(end).days + 1;
	} catch {
		return null;
	}
}

function windowOk(start: string, end: string): boolean {
	try {
		return (
			Temporal.PlainTime.compare(Temporal.PlainTime.from(end), Temporal.PlainTime.from(start)) > 0
		);
	} catch {
		return false;
	}
}

function capExpires(computed: Temporal.Instant): Temporal.Instant {
	const ceiling = Temporal.Now.instant().add({ hours: EXPIRY_CEILING_HOURS });
	return Temporal.Instant.compare(computed, ceiling) > 0 ? ceiling : computed;
}

export function apiResponse<T>(result: ApiResult<T> | ApiEmpty): Response {
	if (!result.ok) {
		return result.body
			? Response.json(result.body, { status: result.status })
			: new Response(null, { status: result.status });
	}
	if (result.status === 204) return new Response(null, { status: 204 });
	return Response.json(result.body, { status: result.status });
}

export async function createMeeting(raw: unknown, ip: string): Promise<ApiResult<MeetingJson>> {
	if (!rateLimit.take('create', ipBucketKey(ip))) {
		return { ok: false, status: 429, body: { error: COPY.rateLimited } };
	}
	const parsed = v.safeParse(CreateBody, raw);
	if (!parsed.success) return { ok: false, status: 400 };

	const {
		starts_on,
		ends_on,
		window_start,
		window_end,
		slot_minutes,
		tz,
		meeting_label,
		include_weekends
	} = parsed.output;
	if (!windowOk(window_start, window_end)) return { ok: false, status: 400 };

	const days = dayCount(starts_on, ends_on);
	if (days == null) return { ok: false, status: 400 };
	if (days > MAX_DAYS) return { ok: false, status: 400, body: { error: COPY.over60 } };

	const id = newId();
	const expires = capExpires(expiresAt({ endsOn: ends_on, windowEnd: window_end, tz }));
	const sql = getSql();
	const rows = await sql<MeetingRow[]>`
		INSERT INTO meetings (
			id, meeting_label, starts_on, ends_on, window_start, window_end,
			slot_minutes, include_weekends, tz, expires_at
		)
		VALUES (
			${id},
			${meeting_label},
			${starts_on},
			${ends_on},
			${window_start},
			${window_end},
			${slot_minutes},
			${include_weekends},
			${tz},
			${expires.toString()}
		)
		RETURNING id, meeting_label, starts_on, ends_on, window_start, window_end, slot_minutes, include_weekends, tz, created_at, expires_at
	`;
	const row = rows[0];
	if (!row) return { ok: false, status: 400 };
	return { ok: true, status: 201, body: toMeeting(row) };
}

export async function getMeeting(id: string, ip: string): Promise<ApiResult<GetBody>> {
	if (!rateLimit.take('read', ipBucketKey(ip))) {
		return { ok: false, status: 429, body: { error: COPY.rateLimited } };
	}
	if (!isValidId(id)) return { ok: false, status: 400 };

	const sql = getSql();
	const meetings = await sql<MeetingRow[]>`
		SELECT id, meeting_label, starts_on, ends_on, window_start, window_end, slot_minutes, include_weekends, tz, created_at, expires_at
		FROM meetings
		WHERE id = ${id}
	`;
	const meeting = meetings[0];
	if (!meeting) return { ok: false, status: 404, body: { error: COPY.notFound } };

	const responses = await sql<
		{ participant_id: string; name: string | null; slots: number[]; updated_at: Date | string }[]
	>`
		SELECT participant_id, name, slots, updated_at
		FROM responses
		WHERE meeting_id = ${id}
	`;

	return {
		ok: true,
		status: 200,
		body: {
			meeting: toMeeting(meeting),
			responses: responses.map((r) => ({
				participant_id: r.participant_id,
				name: r.name,
				slots: r.slots,
				updated_at: isoInstant(r.updated_at)
			}))
		}
	};
}
