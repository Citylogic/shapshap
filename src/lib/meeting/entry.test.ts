import { describe, expect, it } from 'vitest';
import { needsEntry } from './entry';

describe('needsEntry', () => {
	it('shows for a device with no claim', () => {
		expect(needsEntry(false, '')).toBe(true);
		expect(needsEntry(false, 'Ada Lovelace')).toBe(true);
	});

	it('shows when a claim exists but the name is missing', () => {
		expect(needsEntry(true, '')).toBe(true);
		expect(needsEntry(true, '  ')).toBe(true);
	});

	it('hides when a claim has a usable name', () => {
		expect(needsEntry(true, 'Ada')).toBe(false);
		expect(needsEntry(true, 'Ada Lovelace')).toBe(false);
		expect(needsEntry(true, 'Ada L')).toBe(false);
	});
});
