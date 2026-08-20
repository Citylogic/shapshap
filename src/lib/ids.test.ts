import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isValidId, newId, scrub } from './ids';

const CADDY_SCRUB = 'regexp "/m/[A-Za-z0-9_-]{22}" "/m/[id]"';
const EXAMPLE_ID = 'bo-8BXgyGW52K0Fa86o72A';

describe('newId', () => {
	it('returns 22-char base64url with no padding', () => {
		const id = newId();
		expect(id).toHaveLength(22);
		expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(id).not.toContain('=');
		expect(id).not.toContain('+');
		expect(id).not.toContain('/');
		expect(isValidId(id)).toBe(true);
	});

	it('is unique across many draws', () => {
		const seen = new Set<string>();
		for (let i = 0; i < 10_000; i++) {
			const id = newId();
			expect(seen.has(id)).toBe(false);
			seen.add(id);
		}
		expect(seen.size).toBe(10_000);
	});
});

describe('isValidId', () => {
	it('accepts a generated id and the PRD example', () => {
		expect(isValidId(newId())).toBe(true);
		expect(isValidId(EXAMPLE_ID)).toBe(true);
	});

	it('rejects wrong length, padding, non-alphabet, and empty', () => {
		expect(isValidId('')).toBe(false);
		expect(isValidId('short')).toBe(false);
		expect(isValidId(EXAMPLE_ID + 'x')).toBe(false);
		expect(isValidId(EXAMPLE_ID.slice(0, 21))).toBe(false);
		expect(isValidId(EXAMPLE_ID.slice(0, 20) + '==')).toBe(false);
		expect(isValidId(EXAMPLE_ID.slice(0, 21) + '+')).toBe(false);
		expect(isValidId(EXAMPLE_ID.slice(0, 21) + '/')).toBe(false);
		expect(isValidId('!' + EXAMPLE_ID.slice(1))).toBe(false);
	});
});

describe('scrub', () => {
	it('rewrites real /m/{id} paths, including API and query strings', () => {
		expect(scrub(`/m/${EXAMPLE_ID}`)).toBe('/m/[id]');
		expect(scrub(`https://shapshap.link/m/${EXAMPLE_ID}`)).toBe('https://shapshap.link/m/[id]');
		expect(scrub(`/api/m/${EXAMPLE_ID}`)).toBe('/api/m/[id]');
		expect(scrub(`/api/m/${EXAMPLE_ID}/r/x`)).toBe('/api/m/[id]/r/x');
		expect(scrub(`/m/${EXAMPLE_ID}?from=share`)).toBe('/m/[id]?from=share');
		expect(scrub(`/?next=/m/${EXAMPLE_ID}`)).toBe('/?next=/m/[id]');
	});

	it('rewrites every occurrence in one string', () => {
		const a = newId();
		const b = newId();
		expect(scrub(`/m/${a} /m/${b}`)).toBe('/m/[id] /m/[id]');
	});

	it('leaves non-id paths alone', () => {
		expect(scrub('/')).toBe('/');
		expect(scrub('/why')).toBe('/why');
		expect(scrub('/api/health')).toBe('/api/health');
		expect(scrub(`/m/${EXAMPLE_ID.slice(0, 8)}`)).toBe(`/m/${EXAMPLE_ID.slice(0, 8)}`);
		expect(scrub(EXAMPLE_ID)).toBe(EXAMPLE_ID);
	});

	it('does not partially rewrite a longer token', () => {
		const long = EXAMPLE_ID + 'x';
		expect(scrub(`/m/${long}`)).toBe(`/m/${long}`);
	});
});

describe('Caddy parity', () => {
	it('keeps the Caddyfile regexp on the same /m/{22} shape', () => {
		const caddy = readFileSync(resolve('ops/Caddyfile'), 'utf8');
		expect(caddy).toContain(CADDY_SCRUB);
	});
});
