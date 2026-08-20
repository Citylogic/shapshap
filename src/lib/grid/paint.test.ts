import { describe, expect, it } from 'vitest';
import { paintIndex } from './paint';

describe('paintIndex', () => {
	it('paints on without mutating the previous set', () => {
		const prev = new Set([1]);
		const next = paintIndex(prev, 2, 'on');
		expect([...next].sort()).toEqual([1, 2]);
		expect(prev.has(2)).toBe(false);
	});

	it('paints off', () => {
		expect(paintIndex(new Set([1, 2]), 1, 'off')).toEqual(new Set([2]));
	});
});
