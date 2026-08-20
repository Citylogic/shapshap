import { describe, expect, it } from 'vitest';
import { ipBucketKey } from './ip';

describe('ipBucketKey', () => {
	it('keys IPv4 as /32', () => {
		expect(ipBucketKey('192.0.2.1')).toBe('192.0.2.1');
		expect(ipBucketKey('192.0.2.1')).not.toBe(ipBucketKey('192.0.2.2'));
	});

	it('keys IPv6 as /64', () => {
		const a = ipBucketKey('2001:db8:1:2:3:4:5:6');
		const b = ipBucketKey('2001:db8:1:2:ffff:ffff:ffff:ffff');
		const c = ipBucketKey('2001:db8:1:3::1');
		expect(a).toBe(b);
		expect(a).toBe('2001:0db8:0001:0002');
		expect(c).not.toBe(a);
	});

	it('treats IPv4-mapped IPv6 as IPv4', () => {
		expect(ipBucketKey('::ffff:192.0.2.1')).toBe('192.0.2.1');
	});

	it('strips brackets and zone ids', () => {
		expect(ipBucketKey('[2001:db8:1:2::1]')).toBe(ipBucketKey('2001:db8:1:2::1'));
		expect(ipBucketKey('fe80::1%lo0').startsWith('fe80:0000:0000:0000')).toBe(true);
	});

	it('buckets unparseable input together without using the raw string', () => {
		expect(ipBucketKey('')).toBe('unknown');
		expect(ipBucketKey('not-an-ip')).toBe('unknown');
	});
});
