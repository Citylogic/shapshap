import { describe, expect, it } from 'vitest';
import {
	densityLevel,
	displayName,
	freeIdsAt,
	mergeLive,
	scoreOverlap
} from './overlap';

describe('scoreOverlap', () => {
	it('counts per slot and marks the unique max as Best', () => {
		const overlap = scoreOverlap(
			[
				{ participant_id: 'a', name: 'Ada L', slots: [0, 1] },
				{ participant_id: 'b', name: 'Sara M', slots: [1, 2] }
			],
			4
		);
		expect(overlap.counts).toEqual([1, 2, 1, 0]);
		expect(overlap.max).toBe(2);
		expect(overlap.total).toBe(2);
		expect([...overlap.best]).toEqual([1]);
	});

	it('gives every tied max slot the Best mark', () => {
		const overlap = scoreOverlap(
			[
				{ participant_id: 'a', name: 'Ada L', slots: [0, 1] },
				{ participant_id: 'b', name: 'Sara M', slots: [0, 1] }
			],
			3
		);
		expect(overlap.max).toBe(2);
		expect([...overlap.best].sort()).toEqual([0, 1]);
	});

	it('has no Best when nobody is free', () => {
		const overlap = scoreOverlap(
			[
				{ participant_id: 'a', name: 'Ada L', slots: [] },
				{ participant_id: 'b', name: null, slots: [] }
			],
			2
		);
		expect(overlap.max).toBe(0);
		expect(overlap.best.size).toBe(0);
		expect(overlap.total).toBe(2);
	});

	it('ignores out-of-range slot indexes', () => {
		const overlap = scoreOverlap([{ participant_id: 'a', name: null, slots: [-1, 0, 9] }], 2);
		expect(overlap.counts).toEqual([1, 0]);
		expect([...overlap.best]).toEqual([0]);
	});
});

describe('densityLevel', () => {
	it('maps count against the answered total onto four bands', () => {
		expect(densityLevel(0, 4)).toBe(0);
		expect(densityLevel(1, 4)).toBe(1);
		expect(densityLevel(2, 4)).toBe(2);
		expect(densityLevel(3, 4)).toBe(3);
		expect(densityLevel(4, 4)).toBe(4);
		expect(densityLevel(1, 1)).toBe(4);
		expect(densityLevel(1, 0)).toBe(0);
	});
});

describe('freeIdsAt', () => {
	it('returns ids free at the slot', () => {
		const people = [
			{ participant_id: 'a', name: 'Aidan C', slots: [0] },
			{ participant_id: 'b', name: 'Sara M', slots: [0] },
			{ participant_id: 'c', name: 'Thabo N', slots: [0] },
			{ participant_id: 'd', name: 'Nomsa D', slots: [1] }
		];
		expect([...freeIdsAt(people, 0)].sort()).toEqual(['a', 'b', 'c']);
		expect([...freeIdsAt(people, 1)]).toEqual(['d']);
	});

	it('returns an empty set when nobody opted in', () => {
		const people = [
			{ participant_id: 'a', name: 'Ada L', slots: [1] },
			{ participant_id: 'b', name: null, slots: [] }
		];
		expect(freeIdsAt(people, 0).size).toBe(0);
	});
});

describe('displayName', () => {
	it('labels unnamed answered people as Guest N', () => {
		expect(displayName(null, 2)).toBe('Guest 3');
		expect(displayName('Ada L', 0)).toBe('Ada L');
	});
});

describe('mergeLive', () => {
	const ada = { participant_id: 'a', name: 'Ada L', slots: [0] };

	it('appends a new painter once they have slots or a name', () => {
		expect(mergeLive([ada], { participant_id: 'b', name: null, slots: [] })).toEqual([ada]);
		expect(mergeLive([ada], { participant_id: 'b', name: null, slots: [1] })).toEqual([
			ada,
			{ participant_id: 'b', name: null, slots: [1] }
		]);
	});

	it('replaces the matching row so a return visit does not double-count', () => {
		expect(mergeLive([ada], { participant_id: 'a', name: 'Ada L', slots: [0, 1] })).toEqual([
			{ participant_id: 'a', name: 'Ada L', slots: [0, 1] }
		]);
	});
});
