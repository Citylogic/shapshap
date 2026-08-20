/**
 * Meeting grid slot generation. Native Temporal only — never Date-object
 * arithmetic for boundaries (PRD §8, TECH-STACK §5).
 *
 * Polyfill skipped (TECH-STACK §11.3): Node 24.14 exposes Temporal behind
 * `--harmony-temporal` (vitest `execArgv`); adding `temporal-polyfill` would spend
 * ~20 KB of the 60 KB `/m/[id]` budget. Revisit if WebKit e2e (S17) lacks Temporal.
 */

export type SlotMinutes = 15 | 30 | 60;

export type MeetingWindow = {
	startsOn: string;
	endsOn: string;
	windowStart: string;
	windowEnd: string;
	tz: string;
	slotMinutes?: SlotMinutes;
};

export type GridSize = {
	days: number;
	slotsPerDay: number;
	slotCount: number;
};

export type Slot = {
	/** Rectangular index: `dayIndex * slotsPerDay + slotInDay`. */
	index: number;
	dayIndex: number;
	slotInDay: number;
	/** Creator-zone wall date (`YYYY-MM-DD`). */
	localDate: string;
	/** Creator-zone wall time (`HH:MM`), slot start. */
	localTime: string;
	/** Absolute start. `null` when this wall time does not exist (DST gap). */
	instant: Temporal.Instant | null;
};

const DEFAULT_SLOT_MINUTES: SlotMinutes = 30;

function slotMinutesOf(input: MeetingWindow): SlotMinutes {
	return input.slotMinutes ?? DEFAULT_SLOT_MINUTES;
}

function localTimes(
	windowStart: string,
	windowEnd: string,
	slotMinutes: SlotMinutes
): Temporal.PlainTime[] {
	const start = Temporal.PlainTime.from(windowStart);
	const end = Temporal.PlainTime.from(windowEnd);
	if (Temporal.PlainTime.compare(end, start) <= 0) {
		throw new RangeError('windowEnd must be after windowStart');
	}
	const times: Temporal.PlainTime[] = [];
	let t = start;
	while (Temporal.PlainTime.compare(t, end) < 0) {
		times.push(t);
		const next = t.add({ minutes: slotMinutes });
		// PlainTime wraps at midnight. A wrapped next is earlier than t, so the
		// loop condition would never fail (e.g. 08:00–23:31 with 30-min slots).
		if (Temporal.PlainTime.compare(next, t) <= 0) break;
		t = next;
	}
	return times;
}

function eachDate(startsOn: string, endsOn: string): Temporal.PlainDate[] {
	const start = Temporal.PlainDate.from(startsOn);
	const end = Temporal.PlainDate.from(endsOn);
	if (Temporal.PlainDate.compare(end, start) < 0) {
		throw new RangeError('endsOn must be on or after startsOn');
	}
	const dates: Temporal.PlainDate[] = [];
	for (let d = start; Temporal.PlainDate.compare(d, end) <= 0; d = d.add({ days: 1 })) {
		dates.push(d);
	}
	return dates;
}

/** Wall-clock → Instant. Skip spring-forward gaps; take the earlier autumn-back hour. */
function instantAt(
	date: Temporal.PlainDate,
	time: Temporal.PlainTime,
	tz: string
): Temporal.Instant | null {
	const zdt = date.toPlainDateTime(time).toZonedDateTime(tz, { disambiguation: 'compatible' });
	if (zdt.hour !== time.hour || zdt.minute !== time.minute) {
		return null;
	}
	return zdt.toInstant();
}

export function gridSize(input: MeetingWindow): GridSize {
	const days = eachDate(input.startsOn, input.endsOn).length;
	const slotsPerDay = localTimes(input.windowStart, input.windowEnd, slotMinutesOf(input)).length;
	return { days, slotsPerDay, slotCount: days * slotsPerDay };
}

export function generateSlots(input: MeetingWindow): Slot[] {
	const minutes = slotMinutesOf(input);
	const dates = eachDate(input.startsOn, input.endsOn);
	const times = localTimes(input.windowStart, input.windowEnd, minutes);
	const slotsPerDay = times.length;
	const slots: Slot[] = [];

	for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
		const date = dates[dayIndex]!;
		for (let slotInDay = 0; slotInDay < times.length; slotInDay++) {
			const time = times[slotInDay]!;
			slots.push({
				index: dayIndex * slotsPerDay + slotInDay,
				dayIndex,
				slotInDay,
				localDate: date.toString(),
				localTime: time.toString({ smallestUnit: 'minute' }),
				instant: instantAt(date, time, input.tz)
			});
		}
	}

	return slots;
}

/**
 * 24h after the last candidate slot ends (`ends_on` + `window_end` in creator `tz`).
 * S07 caps this at now + 90 days.
 */
export function expiresAt(
	input: Pick<MeetingWindow, 'endsOn' | 'windowEnd' | 'tz'>
): Temporal.Instant {
	const date = Temporal.PlainDate.from(input.endsOn);
	const time = Temporal.PlainTime.from(input.windowEnd);
	const zdt = date
		.toPlainDateTime(time)
		.toZonedDateTime(input.tz, { disambiguation: 'compatible' });
	return zdt.add({ hours: 24 }).toInstant();
}
