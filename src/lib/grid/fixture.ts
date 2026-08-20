import type { MeetingWindow } from '$lib/time';

const WINDOW = {
	windowStart: '08:00',
	windowEnd: '20:00',
	tz: 'Africa/Johannesburg',
	slotMinutes: 30 as const
};

/** Fixed 5-day weekday window for `/dev/grid`. Typical product hours, no DST. */
export const GRID_FIXTURE: MeetingWindow = {
	startsOn: '2026-08-17',
	endsOn: '2026-08-21',
	...WINDOW
};

/** 60-day cap (inclusive). `/dev/grid?days=60` — S04 DOM-size check. */
export const GRID_STRESS_FIXTURE: MeetingWindow = {
	startsOn: '2026-08-17',
	endsOn: '2026-10-15',
	...WINDOW
};
