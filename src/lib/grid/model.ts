import { generateSlots, gridSize, type MeetingWindow } from '$lib/time';
import { wallAt } from './zone';

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
	/** UTC epoch ms per slot index; `null` is a DST gap. JSON-safe for SSR. */
	instants: (number | null)[];
};

function formatDay(iso: string): GridDay {
	try {
		const d = Temporal.PlainDate.from(iso);
		return {
			date: iso,
			weekday: WEEKDAYS[d.dayOfWeek - 1]!,
			day: d.day
		};
	} catch {
		const day = Number(iso.slice(8, 10));
		const sun0 = new Date(`${iso}T00:00:00Z`).getUTCDay();
		const isoDow = sun0 === 0 ? 6 : sun0 - 1;
		return { date: iso, weekday: WEEKDAYS[isoDow]!, day };
	}
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
		})),
		instants: slots.map((s) => s.instant?.epochMilliseconds ?? null)
	};
}

/**
 * Relabel headers from stored instants. Cell indexes stay meeting-grid indexes.
 * Pass the creator-zone model, not an already-relabelled one.
 */
export function relabelGridModel(model: GridModel, tz: string): GridModel {
	const days = model.days.map((day, dayIndex) => {
		const cell = model.cells.find((c) => c.dayIndex === dayIndex && c.exists);
		const ms = cell ? model.instants[cell.index] : null;
		if (ms == null) return day;
		return formatDay(wallAt(ms, tz).date);
	});
	const times = model.times.map((t, slotInDay) => {
		const cell = model.cells.find((c) => c.slotInDay === slotInDay && c.exists);
		const ms = cell ? model.instants[cell.index] : null;
		if (ms == null) return t;
		return formatTime(wallAt(ms, tz).time);
	});
	return { ...model, days, times };
}
