/**
 * Client parser for `/api/m/[id]/live` SSE payloads. Names stay out of logs.
 */

import type { OverlapPerson } from '$lib/grid/overlap';
import { isValidId } from '$lib/ids';

function asPerson(row: unknown): OverlapPerson | null {
	if (!row || typeof row !== 'object') return null;
	const rec = row as Record<string, unknown>;
	if (typeof rec.participant_id !== 'string' || !isValidId(rec.participant_id)) return null;
	if (rec.name != null && typeof rec.name !== 'string') return null;
	if (!Array.isArray(rec.slots)) return null;
	const slots: number[] = [];
	for (const n of rec.slots) {
		if (typeof n !== 'number' || !Number.isInteger(n)) return null;
		slots.push(n);
	}
	return { participant_id: rec.participant_id, name: rec.name ?? null, slots };
}

/** `data:` JSON → response rows. Null if the frame is malformed. */
export function parseLiveMessage(raw: string): OverlapPerson[] | null {
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return null;
	}
	if (!data || typeof data !== 'object' || !('responses' in data)) return null;
	const rows = (data as { responses: unknown }).responses;
	if (!Array.isArray(rows)) return null;
	const out: OverlapPerson[] = [];
	for (const row of rows) {
		const person = asPerson(row);
		if (!person) return null;
		out.push(person);
	}
	return out;
}
