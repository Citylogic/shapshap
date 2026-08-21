/**
 * Meeting-page chrome: org:label, date meta, truncated link, respondent
 * marks, and the day pager window. Unnamed people use G1, G2, … (not `?`).
 */

import { initials } from '$lib/name';

const MONTHS_UPPER = [
	'JAN',
	'FEB',
	'MAR',
	'APR',
	'MAY',
	'JUN',
	'JUL',
	'AUG',
	'SEP',
	'OCT',
	'NOV',
	'DEC'
] as const;

const MONTHS_TITLE = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
] as const;

export const PAGE_SIZE = 5;

export type MonthStyle = 'upper' | 'title';

function months(style: MonthStyle) {
	return style === 'upper' ? MONTHS_UPPER : MONTHS_TITLE;
}

function plainDate(iso: string): Temporal.PlainDate {
	return Temporal.PlainDate.from(iso);
}

export function formatOrgLabel(organisation: string, meetingLabel: string): string {
	return `${organisation}: ${meetingLabel}`.toUpperCase();
}

export function formatCompactDate(iso: string, style: MonthStyle = 'upper'): string {
	const d = plainDate(iso);
	return `${d.day} ${months(style)[d.month - 1]!}`;
}

/** `20–28 AUG` same month; `28 AUG–3 SEP` when the month turns. */
export function formatDateRange(
	startsOn: string,
	endsOn: string,
	style: MonthStyle = 'upper'
): string {
	const start = plainDate(startsOn);
	const end = plainDate(endsOn);
	if (Temporal.PlainDate.compare(start, end) === 0) {
		return formatCompactDate(startsOn, style);
	}
	if (start.month === end.month && start.year === end.year) {
		return `${start.day}–${end.day} ${months(style)[start.month - 1]!}`;
	}
	return `${formatCompactDate(startsOn, style)}–${formatCompactDate(endsOn, style)}`;
}

/** `30 MIN · 20–28 AUG` — slot length plus the meeting’s civil date span. */
export function formatMeetingMeta(
	slotMinutes: number,
	startsOn: string,
	endsOn: string
): string {
	return `${slotMinutes} MIN · ${formatDateRange(startsOn, endsOn, 'upper')}`;
}

export function respondentCountLabel(n: number): string {
	return n === 1 ? '1 RESPONDENT' : `${n} RESPONDENTS`;
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
