import { describe, expect, it } from 'vitest';
import { publishLive, subscribeLive } from './live';

const a = {
	participant_id: 'aaaaaaaaaaaaaaaaaaaaaa',
	name: 'Ada L',
	slots: [0],
	updated_at: '2026-08-21T12:00:00Z'
};

describe('live hub', () => {
	it('delivers to subscribers and drops them after unsubscribe', () => {
		const seen: number[][] = [];
		const stop = subscribeLive('bbbbbbbbbbbbbbbbbbbbbb', (rows) => {
			seen.push(rows.flatMap((r) => [...r.slots]));
		});
		publishLive('bbbbbbbbbbbbbbbbbbbbbb', [a]);
		expect(seen).toEqual([[0]]);
		stop();
		publishLive('bbbbbbbbbbbbbbbbbbbbbb', []);
		expect(seen).toEqual([[0]]);
	});

	it('does not notify a different meeting', () => {
		const seen: number[] = [];
		const stop = subscribeLive('cccccccccccccccccccccc', () => seen.push(1));
		publishLive('dddddddddddddddddddddd', [a]);
		expect(seen).toEqual([]);
		stop();
	});
});
