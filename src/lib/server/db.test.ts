import { describe, expect, it } from 'vitest';
import { connectionString } from './db';

describe('connectionString', () => {
	it('leaves a valid URL unchanged', () => {
		const url = 'postgres://shapshap:secret@postgres:5432/shapshap';
		expect(connectionString(url)).toBe(url);
	});

	it('percent-encodes a password that contains a slash', () => {
		const encoded = connectionString('postgres://shapshap:secr/et+x@postgres:5432/shapshap');
		const parsed = new URL(encoded);
		expect(decodeURIComponent(parsed.password)).toBe('secr/et+x');
		expect(parsed.username).toBe('shapshap');
		expect(parsed.hostname).toBe('postgres');
		expect(parsed.pathname).toBe('/shapshap');
	});

	it('rejects a string that is still not a URL after encoding', () => {
		expect(() => connectionString('not a url')).toThrow('DATABASE_URL is not a valid URL');
	});
});
