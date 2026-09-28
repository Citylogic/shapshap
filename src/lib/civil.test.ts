import { describe, expect, it } from 'vitest';
import {
	civilDay,
	formatCompactDate,
	formatDateRange,
	formatDayLong,
	formatMonthYear,
	formatRangeLabel
} from './civil';
import { formatFlatDay } from './grid/flat';

describe('formatDateRange', () => {
	it('collapses a single day', () => {
		expect(formatCompactDate('2026-08-20')).toBe('20 AUG');
		expect(formatDateRange('2026-08-20', '2026-08-20')).toBe('20 AUG');
	});

	it('keeps the month once when the span stays in it', () => {
		expect(formatDateRange('2026-08-20', '2026-08-28')).toBe('20–28 AUG');
		expect(formatDateRange('2026-08-20', '2026-08-24', 'title')).toBe('20–24 Aug');
	});

	it('repeats the month when the span crosses it', () => {
		expect(formatDateRange('2026-08-28', '2026-09-03')).toBe('28 AUG–3 SEP');
	});
});

describe('formatRangeLabel', () => {
	it('names both ends and keeps a single year at the end', () => {
		expect(formatRangeLabel('2026-09-26', '2026-10-03')).toBe('26 Sep – 3 Oct 2026');
		expect(formatRangeLabel('2026-08-20', '2026-08-24')).toBe('20 Aug – 24 Aug 2026');
		expect(formatRangeLabel('2026-08-20', '2026-08-20')).toBe('20 Aug 2026');
	});

	it('repeats the year when the range crosses it', () => {
		expect(formatRangeLabel('2026-12-28', '2027-01-03')).toBe('28 Dec 2026 – 3 Jan 2027');
	});

	it('spells the month for the picker heading and day name', () => {
		expect(formatMonthYear(2026, 9)).toBe('September 2026');
		expect(formatDayLong('2026-09-26')).toBe('26 September 2026');
	});
});

describe('formatFlatDay', () => {
	it('formats weekday and upper-case month like the mock', () => {
		expect(formatFlatDay('2026-08-20')).toEqual({ weekday: 'Thursday', date: '20 AUG' });
		expect(formatFlatDay('2026-01-01')).toEqual({ weekday: 'Thursday', date: '1 JAN' });
	});
});

describe('civilDay', () => {
	it('maps Sunday and Monday as 7 and 1, short and long', () => {
		expect(civilDay('2026-08-16')).toEqual({
			dayOfWeek: 7,
			day: 16,
			weekdayShort: 'Sun',
			weekdayLong: 'Sunday'
		});
		expect(civilDay('2026-08-17')).toEqual({
			dayOfWeek: 1,
			day: 17,
			weekdayShort: 'Mon',
			weekdayLong: 'Monday'
		});
	});
});
