import { describe, expect, it } from 'vitest';
import { looksLikeContact, parseName } from './name';

describe('parseName', () => {
	it('accepts a first name and initial', () => {
		expect(parseName('Ada L')).toEqual({ ok: true, name: 'Ada L' });
	});

	it('treats missing or blank as null', () => {
		expect(parseName(undefined)).toEqual({ ok: true, name: null });
		expect(parseName(null)).toEqual({ ok: true, name: null });
		expect(parseName('  ')).toEqual({ ok: true, name: null });
	});

	it('rejects over 24 characters with a length reason', () => {
		expect(parseName('a'.repeat(25))).toEqual({ ok: false, reason: 'length' });
		expect(parseName('a'.repeat(24))).toEqual({ ok: true, name: 'a'.repeat(24) });
	});

	it('rejects email-like and phone-like strings', () => {
		expect(parseName('ada@example.com')).toEqual({ ok: false, reason: 'contact' });
		expect(parseName('+27 82 123 4567')).toEqual({ ok: false, reason: 'contact' });
		expect(parseName('0821234567')).toEqual({ ok: false, reason: 'contact' });
	});
});

describe('looksLikeContact', () => {
	it('does not flag ordinary names that happen to contain a digit', () => {
		expect(looksLikeContact('Thabo 2')).toBe(false);
		expect(looksLikeContact('Ada L')).toBe(false);
	});
});
