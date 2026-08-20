/**
 * Device-local meeting → participant claim (PRD §5.4).
 * localStorage only — no server account. Never log the ids.
 */

import { isValidId } from './ids';

const PREFIX = 'shapshap:p:';

export type Kv = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type Restored = {
	participantId: string;
	name: string;
	slots: number[];
	/** Minted this visit; DELETE on takeover so we do not leave a Guest duplicate. */
	ephemeral: boolean;
};

function key(meetingId: string): string {
	return `${PREFIX}${meetingId}`;
}

export function readClaim(meetingId: string, storage: Kv): string | null {
	if (!isValidId(meetingId)) return null;
	let raw: string | null;
	try {
		raw = storage.getItem(key(meetingId));
	} catch {
		return null;
	}
	return raw && isValidId(raw) ? raw : null;
}

export function writeClaim(meetingId: string, participantId: string, storage: Kv): void {
	if (!isValidId(meetingId) || !isValidId(participantId)) return;
	try {
		storage.setItem(key(meetingId), participantId);
	} catch {
		// Private mode or quota — paint still works this visit.
	}
}

export function restoreVisit(
	meetingId: string,
	responses: readonly { participant_id: string; name: string | null; slots: readonly number[] }[],
	storage: Kv,
	mint: () => string
): Restored {
	const stored = readClaim(meetingId, storage);
	if (!stored) {
		return { participantId: mint(), name: '', slots: [], ephemeral: true };
	}
	const mine = responses.find((r) => r.participant_id === stored);
	if (!mine) {
		return { participantId: stored, name: '', slots: [], ephemeral: false };
	}
	return {
		participantId: stored,
		name: mine.name ?? '',
		slots: [...mine.slots],
		ephemeral: false
	};
}
