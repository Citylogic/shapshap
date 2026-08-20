/**
 * Civil-date helpers for the step-1 calendar.
 * Date.UTC here is weekday/month-length of a Y-M-D, not slot-boundary math (PRD §8).
 */

export type DayRange = { start: string; end: string };

export type CalCell = {
	date: string;
	day: number;
	inMonth: boolean;
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const MONTHS = [
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

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

export function toIso(year: number, month: number, day: number): string {
	return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseIso(iso: string): { year: number; month: number; day: number } {
	const [ys, ms, ds] = iso.split('-');
	const year = Number(ys);
	const month = Number(ms);
	const day = Number(ds);
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		throw new RangeError('invalid iso date');
	}
	return { year, month, day };
}

export function orderRange(a: string, b: string): DayRange {
	return a <= b ? { start: a, end: b } : { start: b, end: a };
}

export function inRange(iso: string, range: DayRange): boolean {
	return iso >= range.start && iso <= range.end;
}

/** Monday = 0 … Sunday = 6. */
export function weekdayMon0(iso: string): number {
	const { year, month, day } = parseIso(iso);
	const sun0 = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	return sun0 === 0 ? 6 : sun0 - 1;
}

export function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(
	year: number,
	month: number,
	delta: number
): { year: number; month: number } {
	const idx = year * 12 + (month - 1) + delta;
	return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthLabel(year: number, month: number): string {
	return `${MONTHS[month - 1]} ${year}`;
}

export function monthCells(year: number, month: number): CalCell[] {
	const offset = weekdayMon0(toIso(year, month, 1));
	const dim = daysInMonth(year, month);
	const cells: CalCell[] = [];

	const prev = addMonths(year, month, -1);
	const prevDim = daysInMonth(prev.year, prev.month);
	for (let i = offset; i > 0; i--) {
		const day = prevDim - i + 1;
		cells.push({ date: toIso(prev.year, prev.month, day), day, inMonth: false });
	}
	for (let day = 1; day <= dim; day++) {
		cells.push({ date: toIso(year, month, day), day, inMonth: true });
	}
	const next = addMonths(year, month, 1);
	let day = 1;
	while (cells.length < 42) {
		cells.push({ date: toIso(next.year, next.month, day), day, inMonth: false });
		day += 1;
	}
	return cells;
}
