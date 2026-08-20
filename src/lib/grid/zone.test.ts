import { describe, expect, it } from 'vitest';
import { GRID_FIXTURE } from './fixture';
import { buildGridModel, relabelGridModel } from './model';
import { showZoneControl, wallAt, zoneIds } from './zone';

describe('showZoneControl', () => {
	it('hides until a viewer zone is known, and when it matches the creator', () => {
		expect(showZoneControl(null, 'Africa/Johannesburg')).toBe(false);
		expect(showZoneControl('Africa/Johannesburg', 'Africa/Johannesburg')).toBe(false);
		expect(showZoneControl('America/Los_Angeles', 'Africa/Johannesburg')).toBe(true);
	});
});

describe('zoneIds', () => {
	it('comes from Intl, not a bundled tz database', () => {
		const ids = zoneIds();
		expect(ids).toContain('Africa/Johannesburg');
		expect(ids).toContain('America/Los_Angeles');
		expect(ids).toEqual(Intl.supportedValuesOf('timeZone'));
	});
});

describe('wallAt / relabelGridModel', () => {
	it('keeps creator labels when the view zone matches', () => {
		const model = buildGridModel(GRID_FIXTURE);
		const same = relabelGridModel(model, GRID_FIXTURE.tz);
		expect(same.days[0]).toEqual(model.days[0]);
		expect(same.times[0]).toEqual(model.times[0]);
		expect(same.cells[0]?.index).toBe(0);
	});

	it('relabels a Johannesburg morning as the previous evening in Los Angeles', () => {
		const input = {
			startsOn: '2026-06-15',
			endsOn: '2026-06-15',
			windowStart: '08:00',
			windowEnd: '10:00',
			slotMinutes: 30 as const,
			tz: 'Africa/Johannesburg'
		};
		const model = buildGridModel(input);
		expect(model.times[0]).toEqual({ time: '08:00', label: '08:00' });
		expect(model.days[0]?.date).toBe('2026-06-15');

		const la = relabelGridModel(model, 'America/Los_Angeles');
		expect(la.days[0]).toEqual({ date: '2026-06-14', weekday: 'Sun', day: 14 });
		expect(la.times[0]).toEqual({ time: '23:00', label: '23:00' });
		expect(la.times[1]).toEqual({ time: '23:30', label: '' });
		expect(la.cells.map((c) => c.index)).toEqual(model.cells.map((c) => c.index));

		const first = wallAt(model.instants[0]!, 'America/Los_Angeles');
		expect(first).toEqual({ date: '2026-06-14', time: '23:00' });
		const last = wallAt(model.instants[3]!, 'America/Los_Angeles');
		expect(last).toEqual({ date: '2026-06-15', time: '00:30' });
	});
});
