/**
 * Civil date labels for display. Weekday and month names live only here.
 * When Temporal is missing, `Date` reads the year, month, day, and weekday
 * of a YYYY-MM-DD string. That read is not slot-boundary math.
 */

const WEEKDAYS = [
	{ short: 'Mon', long: 'Monday' },
	{ short: 'Tue', long: 'Tuesday' },
	{ short: 'Wed', long: 'Wednesday' },
	{ short: 'Thu', long: 'Thursday' },
	{ short: 'Fri', long: 'Friday' },
	{ short: 'Sat', long: 'Saturday' },
	{ short: 'Sun', long: 'Sunday' }
] as const;

export const WEEKDAY_SHORT = WEEKDAYS.map((day) => day.short);

/** One list. Upper and title case are applied when formatting. */
const MONTHS = [
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec'
] as const;

const MONTHS_LONG = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

export type MonthStyle = 'upper' | 'title';

type ParsedCivil = {
	year: number;
	month: number;
	day: number;
	/** Monday = 1 … Sunday = 7, matching Temporal.PlainDate.dayOfWeek. */
	dayOfWeek: number;
};

export type CivilDay = {
	/** Monday = 1 … Sunday = 7, matching Temporal.PlainDate.dayOfWeek. */
	dayOfWeek: number;
	day: number;
	weekdayShort: string;
	weekdayLong: string;
};

function monthLabel(month: number, style: MonthStyle): string {
	const name = MONTHS[month - 1] ?? '';
	if (style === 'upper') return name.toUpperCase();
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/** UTC weekday of a YYYY-MM-DD string. Monday = 1 … Sunday = 7. */
function weekdayFromDate(iso: string): number {
	const sun0 = new Date(`${iso}T00:00:00Z`).getUTCDay();
	return sun0 === 0 ? 7 : sun0;
}

/**
 * Year, month, day, and weekday of a civil date. Temporal when it exists;
 * otherwise `Date` only reads those fields off the YYYY-MM-DD string.
 */
function parseCivilDate(iso: string): ParsedCivil {
	if (typeof Temporal !== 'undefined') {
		const d = Temporal.PlainDate.from(iso);
		return { year: d.year, month: d.month, day: d.day, dayOfWeek: d.dayOfWeek };
	}
	return {
		year: Number(iso.slice(0, 4)),
		month: Number(iso.slice(5, 7)),
		day: Number(iso.slice(8, 10)),
		dayOfWeek: weekdayFromDate(iso)
	};
}

/** Weekday names and day-of-month from one parse. */
export function civilDay(iso: string): CivilDay {
	const parsed = parseCivilDate(iso);
	const names = WEEKDAYS[parsed.dayOfWeek - 1];
	return {
		dayOfWeek: parsed.dayOfWeek,
		day: parsed.day,
		weekdayShort: names?.short ?? '',
		weekdayLong: names?.long ?? ''
	};
}

export function formatCompactDate(iso: string, style: MonthStyle = 'upper'): string {
	const d = parseCivilDate(iso);
	return `${d.day} ${monthLabel(d.month, style)}`;
}

/** `20–28 AUG` same month; `28 AUG–3 SEP` when the month turns. */
export function formatDateRange(
	startsOn: string,
	endsOn: string,
	style: MonthStyle = 'upper'
): string {
	const start = parseCivilDate(startsOn);
	const end = parseCivilDate(endsOn);
	if (start.year === end.year && start.month === end.month && start.day === end.day) {
		return formatCompactDate(startsOn, style);
	}
	if (start.month === end.month && start.year === end.year) {
		return `${start.day}–${end.day} ${monthLabel(start.month, style)}`;
	}
	return `${formatCompactDate(startsOn, style)}–${formatCompactDate(endsOn, style)}`;
}

/** `September 2026` for the range picker heading. */
export function formatMonthYear(year: number, month: number): string {
	return `${MONTHS_LONG[month - 1] ?? ''} ${year}`;
}

/** `26 September 2026` for a day button name. */
export function formatDayLong(iso: string): string {
	const d = parseCivilDate(iso);
	return `${d.day} ${MONTHS_LONG[d.month - 1] ?? ''} ${d.year}`;
}

/**
 * Closed field: `26 Sep – 3 Oct 2026`.
 * The year is repeated on both ends only when the range crosses a year.
 */
export function formatRangeLabel(startsOn: string, endsOn: string): string {
	const start = parseCivilDate(startsOn);
	const end = parseCivilDate(endsOn);
	const left = formatCompactDate(startsOn, 'title');
	const right = formatCompactDate(endsOn, 'title');
	if (start.year === end.year) {
		if (startsOn === endsOn) return `${left} ${start.year}`;
		return `${left} – ${right} ${start.year}`;
	}
	return `${left} ${start.year} – ${right} ${end.year}`;
}

/** Civil today in `tz`. Display only — not slot-boundary math. */
export function todayIso(tz: string): string {
	try {
		return Temporal.Now.plainDateISO(tz).toString();
	} catch {
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone: tz,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).formatToParts(new Date());
		const v = (type: Intl.DateTimeFormatPartTypes) =>
			parts.find((p) => p.type === type)?.value ?? '';
		return `${v('year')}-${v('month')}-${v('day')}`;
	}
}

/** IANA zone of this device. */
export function deviceTz(): string {
	try {
		return Temporal.Now.timeZoneId();
	} catch {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	}
}
