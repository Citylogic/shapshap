/**
 * Viewer-zone labels for an already-generated grid (PRD §8).
 * Slot indices stay in the creator-zone meeting grid; only wall labels move.
 */

export function zoneIds(): string[] {
	try {
		return Intl.supportedValuesOf('timeZone');
	} catch {
		return [];
	}
}

/** Hidden until hydrate proves the device zone differs from the creator's. */
export function showZoneControl(viewer: string | null, creator: string): boolean {
	return viewer != null && viewer !== creator;
}

/**
 * Civil date + clock in `tz` for a stored UTC instant.
 * Uses Temporal when present; Intl otherwise. `new Date(epochMs)` here only
 * reads an instant for display — it does not compute slot boundaries.
 */
export function wallAt(epochMs: number, tz: string): { date: string; time: string } {
	try {
		const zdt = Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(tz);
		return {
			date: zdt.toPlainDate().toString(),
			time: zdt.toPlainTime().toString({ smallestUnit: 'minute' })
		};
	} catch {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		}).formatToParts(new Date(epochMs));
		const v = (type: Intl.DateTimeFormatPartTypes) =>
			parts.find((p) => p.type === type)?.value ?? '';
		return { date: `${v('year')}-${v('month')}-${v('day')}`, time: `${v('hour')}:${v('minute')}` };
	}
}
