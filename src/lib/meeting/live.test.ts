import { describe, expect, it } from 'vitest';
import { parseLiveMessage } from './live';

const row = {
	participant_id: 'aaaaaaaaaaaaaaaaaaaaaa',
	name: 'Ada L',
	slots: [0, 2]
};

describe('parseLiveMessage', () => {
	it('accepts a responses array', () => {
		expect(parseLiveMessage(JSON.stringify({ responses: [row] }))).toEqual([
			{ participant_id: row.participant_id, name: 'Ada L', slots: [0, 2] }
		]);
		expect(parseLiveMessage(JSON.stringify({ responses: [] }))).toEqual([]);
	});

	it('rejects malformed frames', () => {
		expect(parseLiveMessage('{')).toBeNull();
		expect(parseLiveMessage(JSON.stringify({}))).toBeNull();
		expect(parseLiveMessage(JSON.stringify({ responses: [{ ...row, slots: ['0'] }] }))).toBeNull();
		expect(
			parseLiveMessage(JSON.stringify({ responses: [{ ...row, participant_id: 'nope' }] }))
		).toBeNull();
	});
});
