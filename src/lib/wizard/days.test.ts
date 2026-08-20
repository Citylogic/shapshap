import { describe, expect, it } from 'vitest';
import { addMonths, inRange, monthCells, monthLabel, orderRange, toIso, weekdayMon0 } from './days';

describe('orderRange', () => {
	it('orders two dates inclusive of either drag direction', () => {
		expect(orderRange('2026-08-17', '2026-08-21')).toEqual({
			start: '2026-08-17',
			end: '2026-08-21'
		});
		expect(orderRange('2026-08-21', '2026-08-17')).toEqual({
			start: '2026-08-17',
			end: '2026-08-21'
		});
		expect(orderRange('2026-08-17', '2026-08-17')).toEqual({
			start: '2026-08-17',
			end: '2026-08-17'
		});
	});
});

describe('inRange', () => {
	it('includes the ends', () => {
		const r = { start: '2026-08-17', end: '2026-08-21' };
		expect(inRange('2026-08-17', r)).toBe(true);
		expect(inRange('2026-08-19', r)).toBe(true);
		expect(inRange('2026-08-21', r)).toBe(true);
		expect(inRange('2026-08-16', r)).toBe(false);
		expect(inRange('2026-08-22', r)).toBe(false);
	});
});

describe('monthCells', () => {
	it('lays out August 2026 Monday-first with leading July days', () => {
		expect(weekdayMon0('2026-08-01')).toBe(5);
		expect(monthLabel(2026, 8)).toBe('August 2026');
		const cells = monthCells(2026, 8);
		expect(cells).toHaveLength(42);
		expect(cells[0]).toEqual({ date: '2026-07-27', day: 27, inMonth: false });
		expect(cells[5]).toEqual({ date: '2026-08-01', day: 1, inMonth: true });
		expect(cells[35]).toEqual({ date: '2026-08-31', day: 31, inMonth: true });
		expect(cells[36]).toEqual({ date: '2026-09-01', day: 1, inMonth: false });
	});
});

describe('addMonths', () => {
	it('wraps the year', () => {
		expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
		expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
	});
});

describe('toIso', () => {
	it('zero-pads month and day', () => {
		expect(toIso(2026, 8, 3)).toBe('2026-08-03');
	});
});
