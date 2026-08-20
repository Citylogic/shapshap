import { generateSlots, gridSize, type MeetingWindow } from '$lib/time';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type GridDay = {
	date: string;
	weekday: string;
	day: number;
};

export type GridTime = {
	time: string;
	/** Empty on half-hour rows so the label column stays quiet. */
	label: string;
};

export type GridCell = {
	index: number;
	dayIndex: number;
	slotInDay: number;
	exists: boolean;
};

export type GridModel = {
	days: GridDay[];
	times: GridTime[];
	slotsPerDay: number;
	cells: GridCell[];
};

function formatDay(iso: string): GridDay {
	const d = Temporal.PlainDate.from(iso);
	return {
		date: iso,
		weekday: WEEKDAYS[d.dayOfWeek - 1]!,
		day: d.day
	};
}

function formatTime(hm: string): GridTime {
	return { time: hm, label: hm.endsWith(':00') ? hm : '' };
}

/** Rectangular day × time view of S02 `generateSlots` output. */
export function buildGridModel(input: MeetingWindow): GridModel {
	const slots = generateSlots(input);
	const size = gridSize(input);
	const days: GridDay[] = [];
	const times: GridTime[] = [];

	for (const slot of slots) {
		if (slot.slotInDay === 0) days.push(formatDay(slot.localDate));
		if (slot.dayIndex === 0) times.push(formatTime(slot.localTime));
	}

	return {
		days,
		times,
		slotsPerDay: size.slotsPerDay,
		cells: slots.map((s) => ({
			index: s.index,
			dayIndex: s.dayIndex,
			slotInDay: s.slotInDay,
			exists: s.instant !== null
		}))
	};
}
