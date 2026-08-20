import { describe, expect, it } from 'vitest';
import { readClaim, restoreVisit, writeClaim, type Kv } from './claim';
import { newId } from './ids';

function memory(): Kv & { map: Map<string, string> } {
	const map = new Map<string, string>();
	return {
		map,
		getItem: (k) => map.get(k) ?? null,
		setItem: (k, v) => {
			map.set(k, v);
		},
		removeItem: (k) => {
			map.delete(k);
		}
	};
}

describe('writeClaim / readClaim', () => {
	it('round-trips a participant id keyed by meeting id', () => {
		const storage = memory();
		const meetingId = newId();
		const participantId = newId();
		writeClaim(meetingId, participantId, storage);
		expect(readClaim(meetingId, storage)).toBe(participantId);
		expect(readClaim(newId(), storage)).toBeNull();
	});

	it('rejects stored values that are not 22-char ids', () => {
		const storage = memory();
		const meetingId = newId();
		storage.setItem(`shapshap:p:${meetingId}`, 'not-an-id');
		expect(readClaim(meetingId, storage)).toBeNull();
	});
});

describe('restoreVisit', () => {
	it('mints an ephemeral id when this device has no claim', () => {
		const minted = newId();
		const restored = restoreVisit(newId(), [], memory(), () => minted);
		expect(restored).toEqual({
			participantId: minted,
			name: '',
			slots: [],
			ephemeral: true
		});
	});

	it('loads the matching response into the editable claim', () => {
		const storage = memory();
		const meetingId = newId();
		const participantId = newId();
		writeClaim(meetingId, participantId, storage);
		const restored = restoreVisit(
			meetingId,
			[{ participant_id: participantId, name: 'Ada L', slots: [0, 2] }],
			storage,
			() => newId()
		);
		expect(restored).toEqual({
			participantId,
			name: 'Ada L',
			slots: [0, 2],
			ephemeral: false
		});
	});

	it('keeps a stored id that is not in the response list', () => {
		const storage = memory();
		const meetingId = newId();
		const participantId = newId();
		writeClaim(meetingId, participantId, storage);
		const restored = restoreVisit(meetingId, [], storage, () => newId());
		expect(restored.participantId).toBe(participantId);
		expect(restored.ephemeral).toBe(false);
	});
});
