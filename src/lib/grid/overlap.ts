/**
 * Per-slot overlap scoring and hover highlight helpers (PRD §5.3).
 * Ties all carry Best.
 */

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

/** Participant ids free at `index`. Empty when nobody opted in. */
export function freeIdsAt(responses: readonly OverlapPerson[], index: number): Set<string> {
	const free = new Set<string>();
	for (const person of responses) {
		if (person.slots.includes(index)) free.add(person.participant_id);
	}
	return free;
}
