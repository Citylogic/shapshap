/**
 * Flat day-column view of `GridModel`. Slot indexes stay meeting-grid indexes.
 */

import { civilDay, formatCompactDate } from '$lib/civil';
import type { GridCell, GridDay, GridModel } from './model';

export type FlatDayHeader = {
	weekday: string;
	date: string;
};

export type FlatDayColumn = {
	dayIndex: number;
	day: GridDay;
	header: FlatDayHeader;
	cells: GridCell[];
};

/** Left lane is :00 (even `slotInDay`); right lane is :30 (odd). */
export function laneOf(slotInDay: number): 0 | 1 {
	return (slotInDay % 2) as 0 | 1;
}

/** Group model cells by day, preserving `cell.index`. */
export function columnsOf(model: GridModel): FlatDayColumn[] {
	const buckets: GridCell[][] = model.days.map(() => []);
	for (const cell of model.cells) {
		buckets[cell.dayIndex]?.push(cell);
	}
	return model.days.map((day, dayIndex) => ({
		dayIndex,
		day,
		header: formatFlatDay(day.date),
		cells: buckets[dayIndex] ?? []
	}));
}

export function formatFlatDay(iso: string): FlatDayHeader {
	return {
		weekday: civilDay(iso).weekdayLong,
		date: formatCompactDate(iso)
	};
}

export function isToday(iso: string, today: string): boolean {
	return iso === today;
}

export function selectedCountForDay(
	selected: ReadonlySet<number>,
	cells: readonly GridCell[]
): number {
	let n = 0;
	for (const cell of cells) {
		if (cell.exists && selected.has(cell.index)) n += 1;
	}
	return n;
}

/** `2 hrs selected` from slot count × minutes. Whole hours stay integers. */
export function formatHoursSelected(slots: number, slotMinutes: number): string {
	const hours = (slots * slotMinutes) / 60;
	const label = Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 10) / 10);
	return `${label} ${hours === 1 ? 'hr' : 'hrs'} selected`;
}

/** Drop this day's existing slot indexes; leave other days untouched. */
export function clearDay(selected: ReadonlySet<number>, cells: readonly GridCell[]): Set<number> {
	const drop = new Set<number>();
	for (const cell of cells) {
		if (cell.exists) drop.add(cell.index);
	}
	const next = new Set<number>();
	for (const index of selected) {
		if (!drop.has(index)) next.add(index);
	}
	return next;
}
