import { deviceTz } from '$lib/civil';
import { COPY } from '$lib/copy';

export const MAX_DAYS = 60;
export const LABEL_MAX = 80;

export type DayRange = { start: string; end: string };

export type CreateBody = {
	meeting_label: string;
	starts_on: string;
	ends_on: string;
	include_weekends: boolean;
	tz: string;
};

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

/** True when the inclusive range contains a Saturday or Sunday. */
export function rangeIncludesWeekend(startsOn: string, endsOn: string): boolean {
	const span = daySpan(startsOn, endsOn);
	if (span == null) return false;
	if (span >= 7) return true;
	const start = Temporal.PlainDate.from(startsOn);
	for (let i = 0; i < span; i++) {
		const dow = start.add({ days: i }).dayOfWeek;
		if (dow === 6 || dow === 7) return true;
	}
	return false;
}

export function defaultRange(today = Temporal.Now.plainDateISO()): DayRange {
	return { start: today.toString(), end: today.add({ days: 7 }).toString() };
}

export function createBody(
	meetingLabel: string,
	range: DayRange,
	includeWeekends: boolean
): CreateBody {
	return {
		meeting_label: meetingLabel.trim(),
		starts_on: range.start,
		ends_on: range.end,
		include_weekends: includeWeekends,
		tz: deviceTz()
	};
}

export function rangeError(range: DayRange): string | null {
	const days = daySpan(range.start, range.end);
	if (days != null && days > MAX_DAYS) return COPY.over60;
	return null;
}

export function formReady(meetingLabel: string, range: DayRange | null): boolean {
	if (!meetingLabel.trim() || !range) return false;
	return rangeError(range) == null && daySpan(range.start, range.end) != null;
}

export function meetingHref(id: string, origin: string): string {
	return `${origin.replace(/\/$/, '')}/m/${id}`;
}

export async function postMeeting(
	meetingLabel: string,
	range: DayRange,
	includeWeekends: boolean
): Promise<{ ok: true; id: string } | { ok: false; error: string | null }> {
	if (!formReady(meetingLabel, range)) {
		const early = range ? rangeError(range) : null;
		return { ok: false, error: early };
	}

	let res: Response;
	try {
		res = await fetch('/api/m', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(createBody(meetingLabel, range, includeWeekends))
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
