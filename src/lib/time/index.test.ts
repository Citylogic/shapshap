import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { expiresAt, generateSlots, gridSize, type MeetingWindow } from './index';

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), 'utf8');

function instants(slots: ReturnType<typeof generateSlots>): Temporal.Instant[] {
	return slots.flatMap((s) => (s.instant ? [s.instant] : []));
}

describe('generateSlots', () => {
	it('SA winter range (Africa/Johannesburg) — no DST, common case', () => {
		const input: MeetingWindow = {
			startsOn: '2026-06-15',
			endsOn: '2026-06-21',
			windowStart: '09:00',
			windowEnd: '17:00',
			slotMinutes: 30,
			tz: 'Africa/Johannesburg'
		};
		const size = gridSize(input);
		expect(size).toEqual({ days: 7, slotsPerDay: 16, slotCount: 112 });

		const slots = generateSlots(input);
		expect(slots).toHaveLength(112);
		expect(slots.every((s) => s.instant !== null)).toBe(true);

		const first = slots[0]!;
		expect(first.localDate).toBe('2026-06-15');
		expect(first.localTime).toBe('09:00');
		expect(first.instant!.toZonedDateTimeISO(input.tz).offset).toBe('+02:00');

		const last = slots[111]!;
		expect(last.index).toBe(111);
		expect(last.localDate).toBe('2026-06-21');
		expect(last.localTime).toBe('16:30');
		expect(last.instant!.toZonedDateTimeISO(input.tz).offset).toBe('+02:00');

		const epochs = instants(slots).map((i) => i.epochNanoseconds);
		expect(new Set(epochs).size).toBe(112);
		for (let i = 1; i < epochs.length; i++) {
			expect(epochs[i]! > epochs[i - 1]!).toBe(true);
		}
	});

	it('Northern spring-forward — missing hour is skipped, not shifted', () => {
		const input: MeetingWindow = {
			startsOn: '2026-03-08',
			endsOn: '2026-03-08',
			windowStart: '01:00',
			windowEnd: '04:00',
			slotMinutes: 30,
			tz: 'America/Los_Angeles'
		};
		const slots = generateSlots(input);
		expect(gridSize(input)).toEqual({ days: 1, slotsPerDay: 6, slotCount: 6 });
		expect(slots).toHaveLength(6);

		const byTime = Object.fromEntries(slots.map((s) => [s.localTime, s]));
		expect(byTime['01:00']?.instant).not.toBeNull();
		expect(byTime['01:30']?.instant).not.toBeNull();
		expect(byTime['02:00']?.instant).toBeNull();
		expect(byTime['02:30']?.instant).toBeNull();
		expect(byTime['03:00']?.instant).not.toBeNull();
		expect(byTime['03:30']?.instant).not.toBeNull();

		const extant = instants(slots);
		expect(extant).toHaveLength(4);
		expect(extant[0]!.toZonedDateTimeISO(input.tz).toString()).toBe(
			'2026-03-08T01:00:00-08:00[America/Los_Angeles]'
		);
		expect(extant[1]!.toZonedDateTimeISO(input.tz).toString()).toBe(
			'2026-03-08T01:30:00-08:00[America/Los_Angeles]'
		);
		expect(extant[2]!.toZonedDateTimeISO(input.tz).toString()).toBe(
			'2026-03-08T03:00:00-07:00[America/Los_Angeles]'
		);
		expect(extant[3]!.epochNanoseconds > extant[2]!.epochNanoseconds).toBe(true);
		expect(slots.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it('autumn-back with repeated hour — one slot per wall time, no double-count', () => {
		const input: MeetingWindow = {
			startsOn: '2026-11-01',
			endsOn: '2026-11-01',
			windowStart: '00:30',
			windowEnd: '03:00',
			slotMinutes: 30,
			tz: 'America/Los_Angeles'
		};
		const slots = generateSlots(input);
		expect(gridSize(input).slotsPerDay).toBe(5);
		expect(slots).toHaveLength(5);
		expect(slots.every((s) => s.instant !== null)).toBe(true);
		expect(slots.map((s) => s.localTime)).toEqual(['00:30', '01:00', '01:30', '02:00', '02:30']);

		const one = slots.find((s) => s.localTime === '01:30')!.instant!.toZonedDateTimeISO(input.tz);
		expect(one.toString()).toBe('2026-11-01T01:30:00-07:00[America/Los_Angeles]');

		const epochs = instants(slots).map((i) => i.epochNanoseconds);
		expect(new Set(epochs).size).toBe(5);
		for (let i = 1; i < epochs.length; i++) {
			expect(epochs[i]! > epochs[i - 1]!).toBe(true);
		}
	});

	it('cross-zone Africa/Johannesburg × America/Los_Angeles — ragged edges', () => {
		const input: MeetingWindow = {
			startsOn: '2026-06-15',
			endsOn: '2026-06-15',
			windowStart: '08:00',
			windowEnd: '10:00',
			slotMinutes: 30,
			tz: 'Africa/Johannesburg'
		};
		const slots = generateSlots(input);
		expect(slots).toHaveLength(4);

		const firstLa = slots[0]!.instant!.toZonedDateTimeISO('America/Los_Angeles');
		expect(firstLa.toPlainDate().toString()).toBe('2026-06-14');
		expect(firstLa.toPlainTime().toString({ smallestUnit: 'minute' })).toBe('23:00');

		const lastLa = slots[3]!.instant!.toZonedDateTimeISO('America/Los_Angeles');
		expect(lastLa.toPlainDate().toString()).toBe('2026-06-15');
		expect(lastLa.toPlainTime().toString({ smallestUnit: 'minute' })).toBe('00:30');

		const datesInLa = new Set(
			slots.map((s) =>
				s.instant!.toZonedDateTimeISO('America/Los_Angeles').toPlainDate().toString()
			)
		);
		expect(datesInLa.size).toBeGreaterThan(1);
	});

	it('accepts 15 and 60 minute slot sizes', () => {
		const base = {
			startsOn: '2026-06-15',
			endsOn: '2026-06-15',
			windowStart: '09:00',
			windowEnd: '10:00',
			tz: 'Africa/Johannesburg'
		};
		expect(gridSize({ ...base, slotMinutes: 15 }).slotsPerDay).toBe(4);
		expect(gridSize({ ...base, slotMinutes: 60 }).slotsPerDay).toBe(1);
		expect(gridSize({ ...base }).slotsPerDay).toBe(2);
	});

	it('stops at midnight instead of wrapping when windowEnd is not on a slot boundary', () => {
		const input: MeetingWindow = {
			startsOn: '2026-06-15',
			endsOn: '2026-06-15',
			windowStart: '08:00',
			windowEnd: '23:31',
			slotMinutes: 30,
			tz: 'Africa/Johannesburg'
		};
		const size = gridSize(input);
		expect(size).toEqual({ days: 1, slotsPerDay: 32, slotCount: 32 });
		const slots = generateSlots(input);
		expect(slots).toHaveLength(32);
		expect(slots[0]?.localTime).toBe('08:00');
		expect(slots[31]?.localTime).toBe('23:30');
	});

	it('omits Saturday and Sunday when includeWeekends is false', () => {
		const input: MeetingWindow = {
			startsOn: '2026-08-17',
			endsOn: '2026-08-23',
			windowStart: '08:00',
			windowEnd: '20:00',
			slotMinutes: 30,
			tz: 'Africa/Johannesburg',
			includeWeekends: false
		};
		const size = gridSize(input);
		expect(size.days).toBe(5);
		expect(size.slotsPerDay).toBe(24);
		expect(size.slotCount).toBe(120);
		const slots = generateSlots(input);
		expect(slots).toHaveLength(120);
		expect(slots[0]?.localDate).toBe('2026-08-17');
		expect(slots[slots.length - 1]?.localDate).toBe('2026-08-21');
		expect(slots.some((s) => s.localDate === '2026-08-22')).toBe(false);
		expect(slots.some((s) => s.localDate === '2026-08-23')).toBe(false);
	});
});

describe('expiresAt', () => {
	it('is 24h after ends_on + window_end in the creator zone', () => {
		const instant = expiresAt({
			endsOn: '2026-06-21',
			windowEnd: '17:00',
			tz: 'Africa/Johannesburg'
		});
		expect(instant.toString()).toBe('2026-06-22T15:00:00Z');
	});
});

describe('constraints', () => {
	it('does not use new Date() for slot boundary arithmetic', () => {
		expect(SRC).not.toMatch(/new Date\s*\(/);
	});
});
