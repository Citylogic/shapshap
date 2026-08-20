import { COPY } from '$lib/copy';
import type { DayRange } from './days';

export const DEFAULT_WINDOW_START = '08:00';
export const DEFAULT_WINDOW_END = '20:00';
export const SLOT_MINUTES = 30 as const;
export const MAX_DAYS = 60;

export type CreateBody = {
	starts_on: string;
	ends_on: string;
	window_start: string;
	window_end: string;
	slot_minutes: typeof SLOT_MINUTES;
	tz: string;
};

/** `datetime-local` / `time` inputs may include seconds. */
export function hm(raw: string): string {
	return raw.slice(0, 5);
}

export function windowOk(start: string, end: string): boolean {
	try {
		const endTime = Temporal.PlainTime.from(hm(end));
		const startTime = Temporal.PlainTime.from(hm(start));
		return Temporal.PlainTime.compare(endTime, startTime) > 0;
	} catch {
		return false;
	}
}

export function daySpan(startsOn: string, endsOn: string): number | null {
	try {
		const start = Temporal.PlainDate.from(startsOn);
		const end = Temporal.PlainDate.from(endsOn);
		if (Temporal.PlainDate.compare(end, start) < 0) return null;
		return start.until(end).days + 1;
	} catch {
		return null;
	}
}

export function creatorTz(): string {
	try {
		return Temporal.Now.timeZoneId();
	} catch {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	}
}

export function createBody(range: DayRange, windowStart: string, windowEnd: string): CreateBody {
	return {
		starts_on: range.start,
		ends_on: range.end,
		window_start: hm(windowStart),
		window_end: hm(windowEnd),
		slot_minutes: SLOT_MINUTES,
		tz: creatorTz()
	};
}

export function rangeError(range: DayRange): string | null {
	const days = daySpan(range.start, range.end);
	if (days != null && days > MAX_DAYS) return COPY.over60;
	return null;
}

export function meetingHref(id: string, origin: string): string {
	return `${origin.replace(/\/$/, '')}/m/${id}`;
}

export async function postMeeting(
	range: DayRange,
	windowStart: string,
	windowEnd: string
): Promise<{ ok: true; id: string } | { ok: false; error: string | null }> {
	const early = rangeError(range);
	if (early) return { ok: false, error: early };
	if (!windowOk(windowStart, windowEnd)) return { ok: false, error: null };

	let res: Response;
	try {
		res = await fetch('/api/m', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(createBody(range, windowStart, windowEnd))
		});
	} catch {
		return { ok: false, error: null };
	}

	if (res.ok) {
		const body: unknown = await res.json().catch(() => null);
		if (body && typeof body === 'object' && 'id' in body && typeof body.id === 'string') {
			return { ok: true, id: body.id };
		}
		return { ok: false, error: null };
	}

	const body: unknown = await res.json().catch(() => null);
	if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
		return { ok: false, error: body.error };
	}
	if (res.status === 429) return { ok: false, error: COPY.rateLimited };
	return { ok: false, error: null };
}
