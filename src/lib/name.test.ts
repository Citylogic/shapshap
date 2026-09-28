import { describe, expect, it } from 'vitest';
import { initials, looksLikeContact, parseName, splitDisplayName } from './name';

describe('parseName', () => {
	it('accepts a display name, including one word', () => {
		expect(parseName('Ada')).toEqual({ ok: true, name: 'Ada' });
		expect(parseName('Ada Lovelace')).toEqual({ ok: true, name: 'Ada Lovelace' });
		expect(parseName('  Ada   L  ')).toEqual({ ok: true, name: 'Ada L' });
	});

	it('rejects missing or blank', () => {
		expect(parseName(undefined)).toEqual({ ok: false, reason: 'missing' });
		expect(parseName(null)).toEqual({ ok: false, reason: 'missing' });
		expect(parseName('  ')).toEqual({ ok: false, reason: 'missing' });
	});

	it('rejects over 40 characters with a length reason', () => {
		expect(parseName(`Ada ${'b'.repeat(37)}`)).toEqual({ ok: false, reason: 'length' });
		expect(parseName(`Ada ${'b'.repeat(36)}`)).toEqual({
			ok: true,
			name: `Ada ${'b'.repeat(36)}`
		});
	});

	it('rejects email-like and phone-like strings', () => {
		expect(parseName('ada@example.com')).toEqual({ ok: false, reason: 'contact' });
		expect(parseName('+27 82 123 4567')).toEqual({ ok: false, reason: 'contact' });
		expect(parseName('0821234567')).toEqual({ ok: false, reason: 'contact' });
	});
});

describe('splitDisplayName', () => {
	it('splits on the first word', () => {
		expect(splitDisplayName('Ada Lovelace')).toEqual({ first: 'Ada', last: 'Lovelace' });
		expect(splitDisplayName('  Mary Ann Smith ')).toEqual({ first: 'Mary', last: 'Ann Smith' });
		expect(splitDisplayName('Ada')).toEqual({ first: 'Ada', last: '' });
		expect(splitDisplayName('')).toEqual({ first: '', last: '' });
	});
});

describe('initials', () => {
	it('uses the first two letters of one word', () => {
		expect(initials('Ada')).toBe('AD');
		expect(initials('Bo')).toBe('BO');
		expect(initials('A')).toBe('A');
		expect(initials('')).toBe('');
	});

	it('takes the first letter of the first and last words', () => {
		expect(initials('Ada Lovelace')).toBe('AL');
		expect(initials('Mary Ann Smith')).toBe('MS');
	});
});

describe('looksLikeContact', () => {
	it('does not flag ordinary names that happen to contain a digit', () => {
		expect(looksLikeContact('Thabo 2')).toBe(false);
		expect(looksLikeContact('Ada L')).toBe(false);
	});
});
