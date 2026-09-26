/**
 * Meeting-page chrome: label, date meta, truncated link, respondent
 * marks, and the day pager window. Unnamed people use G1, G2, … (not `?`).
 */

import { formatDateRange } from '$lib/civil';
import { initials } from '$lib/name';

export const PAGE_SIZE = 5;

export function formatMeetingLabel(meetingLabel: string): string {
	return meetingLabel.toUpperCase();
}

/** `30 MIN · 20–28 AUG` — slot length plus the meeting’s civil date span. */
export function formatMeetingMeta(slotMinutes: number, startsOn: string, endsOn: string): string {
	return `${slotMinutes} MIN · ${formatDateRange(startsOn, endsOn, 'upper')}`;
}

export function respondentCountLabel(n: number): string {
	return n === 1 ? '1 RESPONDENT' : `${n} RESPONDENTS`;
}

export function availableCountLabel(free: number, total: number): string {
	return `${free} OF ${total} ARE FREE`;
}

/**
 * Two-letter initials when the display name has first + last; otherwise G1-style
 * from answer order so the strip always has a mark.
 */
export function respondentMark(name: string | null, index: number): string {
	if (name) {
		const mark = initials(name);
		if (mark) return mark;
	}
	return `G${index + 1}`;
}

/** Visual truncation only — the copy control still writes the full href. */
export function truncateLink(href: string, keep = 4): string {
	try {
		const u = new URL(href);
		const id = u.pathname.match(/^\/m\/([A-Za-z0-9_-]{22})$/)?.[1];
		if (id) return `${u.host}/m/${id.slice(0, keep)}...`;
		return `${u.host}${u.pathname}`;
	} catch {
		return href;
	}
}

export function clampPageStart(start: number, total: number, size: number = PAGE_SIZE): number {
	if (total <= size) return 0;
	return Math.max(0, Math.min(start, total - size));
}

export function shiftPage(
	start: number,
	delta: number,
	total: number,
	size: number = PAGE_SIZE
): number {
	return clampPageStart(start + delta, total, size);
}

export function jumpEnd(total: number, size: number = PAGE_SIZE): number {
	return clampPageStart(total, total, size);
}

/** First page that includes `today`, or 0 if today is outside the range. */
export function todayPageStart(
	dates: readonly string[],
	today: string,
	size: number = PAGE_SIZE
): number {
	const i = dates.indexOf(today);
	if (i < 0) return 0;
	return clampPageStart(i, dates.length, size);
}

export function visibleRangeLabel(
	dates: readonly string[],
	start: number,
	size: number = PAGE_SIZE
): string {
	const from = dates[start];
	const to = dates[Math.min(dates.length, start + size) - 1];
	if (!from || !to) return '';
	return formatDateRange(from, to, 'title');
}
