/** In-memory token buckets. IPs are keys only — never persisted (PRD §10). */

export type RateKind = 'create' | 'write' | 'read';

type Limit = { capacity: number; windowMs: number };

const LIMITS: Record<RateKind, Limit> = {
	create: { capacity: 5, windowMs: 10 * 60_000 },
	write: { capacity: 60, windowMs: 60_000 },
	read: { capacity: 120, windowMs: 60_000 }
};

type Bucket = { tokens: number; updatedAt: number };

export type RateLimiter = {
	take: (kind: RateKind, ipKey: string) => boolean;
	reset: () => void;
};

export function createRateLimiter(now: () => number = Date.now): RateLimiter {
	const buckets = new Map<string, Bucket>();

	return {
		take(kind, ipKey) {
			const { capacity, windowMs } = LIMITS[kind];
			const id = `${kind}:${ipKey}`;
			const t = now();
			let b = buckets.get(id);
			if (!b || t - b.updatedAt > windowMs * 2) {
				b = { tokens: capacity, updatedAt: t };
			} else {
				b.tokens = Math.min(capacity, b.tokens + ((t - b.updatedAt) * capacity) / windowMs);
				b.updatedAt = t;
			}
			if (b.tokens < 1) {
				buckets.set(id, b);
				return false;
			}
			b.tokens -= 1;
			buckets.set(id, b);
			return true;
		},
		reset() {
			buckets.clear();
		}
	};
}

export const rateLimit = createRateLimiter();
