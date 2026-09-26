import { describe, expect, it } from 'vitest';
import { civilDay, formatCompactDate, formatDateRange } from './civil';
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
