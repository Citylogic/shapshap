import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CADDY = readFileSync(resolve('ops/Caddyfile'), 'utf8');

describe('Caddy security headers', () => {
	it('sets HSTS, Referrer-Policy no-referrer, and strips Server / X-Powered-By', () => {
		expect(CADDY).toContain('Strict-Transport-Security');
		expect(CADDY).toContain('Referrer-Policy           "no-referrer"');
		expect(CADDY).toContain('-Server');
		expect(CADDY).toContain('-X-Powered-By');
	});
});
