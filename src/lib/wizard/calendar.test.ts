import { describe, expect, it } from 'vitest';
import { dayInRange, monthGrid, orderRange } from './calendar';

describe('monthGrid', () => {
	it('pads back to Monday and finishes the trailing week', () => {
		const weeks = monthGrid(2026, 9);
		const cells = weeks.flat();
		expect(cells[0]).toEqual({ iso: '2026-08-31', day: 31, inMonth: false });
		expect(Temporal.PlainDate.from(cells[0]?.iso ?? '').dayOfWeek).toBe(1);
		expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
		expect(cells.at(-1)?.iso).toBe('2026-10-04');
		expect(cells.length % 7).toBe(0);
	});

	it('has no leading days when the month starts on Monday', () => {
		expect(Temporal.PlainDate.from('2026-06-01').dayOfWeek).toBe(1);
		const cells = monthGrid(2026, 6).flat();
		expect(cells[0]).toEqual({ iso: '2026-06-01', day: 1, inMonth: true });
		expect(cells.at(-1)?.iso).toBe('2026-07-05');
		expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
	});

	it('covers a 31-day month that runs into the next year', () => {
		const cells = monthGrid(2026, 12).flat();
		expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
		expect(cells.some((cell) => cell.iso === '2026-12-01')).toBe(true);
		expect(cells.some((cell) => cell.iso === '2026-12-31')).toBe(true);
		expect(cells.at(-1)?.inMonth).toBe(false);
	});
});

describe('orderRange / dayInRange', () => {
	it('keeps a forward range and a one-day range', () => {
		expect(orderRange('2026-09-03', '2026-09-10')).toEqual({
			start: '2026-09-03',
			end: '2026-09-10'
		});
		expect(orderRange('2026-09-03', '2026-09-03')).toEqual({
			start: '2026-09-03',
			end: '2026-09-03'
		});
	});

	it('swaps a click that lands before the start', () => {
		expect(orderRange('2026-09-10', '2026-09-03')).toEqual({
			start: '2026-09-03',
			end: '2026-09-10'
		});
		expect(dayInRange('2026-09-03', '2026-09-10', '2026-09-03')).toBe(true);
		expect(dayInRange('2026-09-10', '2026-09-10', '2026-09-03')).toBe(true);
		expect(dayInRange('2026-09-06', '2026-09-10', '2026-09-03')).toBe(true);
		expect(dayInRange('2026-09-02', '2026-09-10', '2026-09-03')).toBe(false);
		expect(dayInRange('2026-09-11', '2026-09-10', '2026-09-03')).toBe(false);
	});
});
