/**
 * Per-slot overlap scoring and peek copy (PRD §5.3, §15.4).
 * Ties all carry Best; nobody unanswered is listed as "Not free".
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
] as const;

export type OverlapPerson = {
	participant_id: string;
	name: string | null;
	slots: readonly number[];
};

export type Overlap = {
	counts: number[];
	max: number;
	best: Set<number>;
	total: number;
};

export type PeekLists = {
	free: string[];
	notFree: string[];
};

/** Guest N from answer order when the optional name is empty. */
export function displayName(name: string | null, index: number): string {
	return name ?? `Guest ${index + 1}`;
}

/** Replace or append the live painter so the heatmap moves as they paint. */
export function mergeLive(
	responses: readonly OverlapPerson[],
	live: OverlapPerson | null
): OverlapPerson[] {
	if (!live) return [...responses];
	const rest = responses.filter((r) => r.participant_id !== live.participant_id);
	const claimed = rest.length !== responses.length;
	if (!claimed && live.slots.length === 0 && live.name == null) return rest;
	return [...rest, live];
}

export function scoreOverlap(responses: readonly OverlapPerson[], slotCount: number): Overlap {
	const counts = Array.from({ length: slotCount }, () => 0);
	for (const r of responses) {
		for (const index of r.slots) {
			if (index >= 0 && index < slotCount) counts[index]! += 1;
		}
	}
	let max = 0;
	for (const count of counts) {
		if (count > max) max = count;
	}
	const best = new Set<number>();
	if (max > 0) {
		for (let i = 0; i < counts.length; i++) {
			if (counts[i] === max) best.add(i);
		}
	}
	return { counts, max, best, total: responses.length };
}

/** Four-stop scale against how many people have answered. 0 stays empty. */
export function densityLevel(count: number, total: number): 0 | 1 | 2 | 3 | 4 {
	if (count <= 0 || total <= 0) return 0;
	return Math.min(4, Math.max(1, Math.ceil((count / total) * 4))) as 1 | 2 | 3 | 4;
}

export function densityLevels(counts: readonly number[], total: number): number[] {
	return counts.map((count) => densityLevel(count, total));
}

export function peekLists(responses: readonly OverlapPerson[], index: number): PeekLists {
	const free: string[] = [];
	const notFree: string[] = [];
	for (let i = 0; i < responses.length; i++) {
		const person = responses[i]!;
		const label = displayName(person.name, i);
		if (person.slots.includes(index)) free.push(label);
		else notFree.push(label);
	}
	return { free, notFree };
}

/** `Thu 21 Aug, 14:00` — civil date + wall time, no Date-object math. */
export function formatPeekWhen(date: string, time: string): string {
	const d = Temporal.PlainDate.from(date);
	return `${WEEKDAYS[d.dayOfWeek - 1]} ${d.day} ${MONTHS[d.month - 1]}, ${time}`;
}
