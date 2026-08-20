import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('token bucket', () => {
	it('allows up to capacity then denies', () => {
		let t = 0;
		const lim = createRateLimiter(() => t);
		for (let i = 0; i < 5; i++) expect(lim.take('create', '1.1.1.1')).toBe(true);
		expect(lim.take('create', '1.1.1.1')).toBe(false);
	});

	it('refills over the window', () => {
		let t = 0;
		const lim = createRateLimiter(() => t);
		for (let i = 0; i < 5; i++) lim.take('create', '1.1.1.1');
		expect(lim.take('create', '1.1.1.1')).toBe(false);
		t += 2 * 60_000;
		expect(lim.take('create', '1.1.1.1')).toBe(true);
		expect(lim.take('create', '1.1.1.1')).toBe(false);
		t += 10 * 60_000;
		expect(lim.take('create', '1.1.1.1')).toBe(true);
	});

	it('isolates kinds and IPs', () => {
		let t = 0;
		const lim = createRateLimiter(() => t);
		for (let i = 0; i < 5; i++) lim.take('create', '1.1.1.1');
		expect(lim.take('create', '1.1.1.1')).toBe(false);
		expect(lim.take('read', '1.1.1.1')).toBe(true);
		expect(lim.take('create', '2.2.2.2')).toBe(true);
	});

	it('uses write 60/min and read 120/min capacities', () => {
		let t = 0;
		const lim = createRateLimiter(() => t);
		for (let i = 0; i < 60; i++) expect(lim.take('write', 'a')).toBe(true);
		expect(lim.take('write', 'a')).toBe(false);
		for (let i = 0; i < 120; i++) expect(lim.take('read', 'a')).toBe(true);
		expect(lim.take('read', 'a')).toBe(false);
	});

	it('reset clears buckets', () => {
		const lim = createRateLimiter(() => 0);
		for (let i = 0; i < 5; i++) lim.take('create', '1.1.1.1');
		lim.reset();
		expect(lim.take('create', '1.1.1.1')).toBe(true);
	});
});
