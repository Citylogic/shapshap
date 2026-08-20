import { describe, expect, it } from 'vitest';
import { GRID_FIXTURE, GRID_STRESS_FIXTURE } from './fixture';
import { buildGridModel } from './model';

describe('buildGridModel', () => {
	it('lays out S02 slots as a day × time matrix', () => {
		const model = buildGridModel(GRID_FIXTURE);
		expect(model.days).toHaveLength(5);
		expect(model.days[0]).toEqual({ date: '2026-08-17', weekday: 'Mon', day: 17 });
		expect(model.days[4]?.date).toBe('2026-08-21');
		expect(model.slotsPerDay).toBe(24);
		expect(model.times).toHaveLength(24);
		expect(model.times[0]).toEqual({ time: '08:00', label: '08:00' });
		expect(model.times[1]).toEqual({ time: '08:30', label: '' });
		expect(model.cells).toHaveLength(120);
		expect(model.cells.every((c) => c.exists)).toBe(true);
		expect(model.cells[0]).toMatchObject({ index: 0, dayIndex: 0, slotInDay: 0 });
		expect(model.cells[24]).toMatchObject({ index: 24, dayIndex: 1, slotInDay: 0 });
	});

	it('keeps a 60-day × 30-min window rectangular', () => {
		const model = buildGridModel(GRID_STRESS_FIXTURE);
		expect(model.days).toHaveLength(60);
		expect(model.cells).toHaveLength(60 * 24);
	});
});
