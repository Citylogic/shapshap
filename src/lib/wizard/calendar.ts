export type CalendarCell = {
	iso: string;
	day: number;
	inMonth: boolean;
};

/** Monday-first weeks covering `month`, including leading and trailing days. */
export function monthGrid(year: number, month: number): CalendarCell[][] {
	const first = Temporal.PlainDate.from({ year, month, day: 1 });
	let cursor = first.subtract({ days: first.dayOfWeek - 1 });
	const weeks: CalendarCell[][] = [];

	do {
		const week: CalendarCell[] = [];
		for (let i = 0; i < 7; i++) {
			week.push({
				iso: cursor.toString(),
				day: cursor.day,
				inMonth: cursor.year === year && cursor.month === month
			});
			cursor = cursor.add({ days: 1 });
		}
		weeks.push(week);
	} while (cursor.year === year && cursor.month === month);

	return weeks;
}

/** Earlier civil day first. A same-day pair stays a one-day range. */
export function orderRange(a: string, b: string): { start: string; end: string } {
	const left = Temporal.PlainDate.from(a);
	const right = Temporal.PlainDate.from(b);
	if (Temporal.PlainDate.compare(left, right) <= 0) return { start: a, end: b };
	return { start: b, end: a };
}

/** Inclusive. `start` and `end` may arrive in either order. */
export function dayInRange(iso: string, start: string, end: string): boolean {
	const range = orderRange(start, end);
	const day = Temporal.PlainDate.from(iso);
	return (
		Temporal.PlainDate.compare(day, Temporal.PlainDate.from(range.start)) >= 0 &&
		Temporal.PlainDate.compare(day, Temporal.PlainDate.from(range.end)) <= 0
	);
}
