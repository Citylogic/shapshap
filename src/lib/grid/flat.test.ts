import { describe, expect, it } from 'vitest';
import { GRID_FIXTURE } from './fixture';
import {
	columnsOf,
	formatFlatDay,
	formatHoursSelected,
	isToday,
	laneOf,
	selectedCountForDay,
	clearDay
} from './flat';
import { buildGridModel } from './model';

describe('columnsOf', () => {
	it('groups GridModel cells by day without remapping slot indexes', () => {
		const model = buildGridModel(GRID_FIXTURE);
		const columns = columnsOf(model);
		expect(columns).toHaveLength(5);
		expect(columns[0]?.day.date).toBe('2026-08-17');
		expect(columns[0]?.cells).toHaveLength(24);
		expect(columns[0]?.cells[0]).toMatchObject({ index: 0, dayIndex: 0, slotInDay: 0 });
		expect(columns[0]?.cells[1]).toMatchObject({ index: 1, dayIndex: 0, slotInDay: 1 });
		expect(columns[1]?.cells[0]).toMatchObject({ index: 24, dayIndex: 1, slotInDay: 0 });
		expect(columns[4]?.cells[23]).toMatchObject({ index: 119, dayIndex: 4, slotInDay: 23 });
	});

	it('puts even slotInDay in the left lane and odd in the right', () => {
		expect(laneOf(0)).toBe(0);
		expect(laneOf(1)).toBe(1);
		const model = buildGridModel(GRID_FIXTURE);
		const mon = columnsOf(model)[0];
		expect(mon?.cells.filter((c) => laneOf(c.slotInDay) === 0).map((c) => c.index)).toEqual([
			0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22
		]);
		expect(mon?.cells.filter((c) => laneOf(c.slotInDay) === 1).map((c) => c.index)).toEqual([
			1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23
		]);
	});
});

describe('formatFlatDay', () => {
	it('formats weekday and upper-case month like the mock', () => {
		expect(formatFlatDay('2026-08-20')).toEqual({ weekday: 'Thursday', date: '20 AUG' });
		expect(formatFlatDay('2026-01-01')).toEqual({ weekday: 'Thursday', date: '1 JAN' });
	});
});

describe('isToday', () => {
	it('matches a civil YYYY-MM-DD', () => {
		expect(isToday('2026-08-20', '2026-08-20')).toBe(true);
		expect(isToday('2026-08-20', '2026-08-21')).toBe(false);
	});
});

describe('formatHoursSelected', () => {
	it('uses slot count × minutes / 60', () => {
		expect(formatHoursSelected(0, 30)).toBe('0 hrs selected');
		expect(formatHoursSelected(2, 30)).toBe('1 hr selected');
		expect(formatHoursSelected(3, 30)).toBe('1.5 hrs selected');
		expect(formatHoursSelected(4, 30)).toBe('2 hrs selected');
		expect(formatHoursSelected(1, 60)).toBe('1 hr selected');
	});
});

describe('selectedCountForDay', () => {
	it('counts only existing cells for that day', () => {
		const model = buildGridModel(GRID_FIXTURE);
		const mon = columnsOf(model)[0]!.cells;
		expect(selectedCountForDay(new Set([0, 1, 24]), mon)).toBe(2);
		expect(selectedCountForDay(new Set([24]), mon)).toBe(0);
	});
});

describe('clearDay', () => {
	it('removes only that day selected slots', () => {
		const model = buildGridModel(GRID_FIXTURE);
		const columns = columnsOf(model);
		const mon = columns[0]!.cells;
		const tue = columns[1]!.cells;
		const next = clearDay(new Set([0, 1, 24, 25]), mon);
		expect([...next].sort((a, b) => a - b)).toEqual([24, 25]);
		expect(clearDay(new Set([24, 25]), tue)).toEqual(new Set());
		expect(clearDay(new Set([24]), mon)).toEqual(new Set([24]));
	});
});
