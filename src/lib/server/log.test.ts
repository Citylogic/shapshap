import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { newId } from '$lib/ids';
import { loggerOptions, scrubLog, scrubValue } from './log';

function collect() {
	const lines: string[] = [];
	const stream = new Writable({
		write(chunk, _enc, cb) {
			lines.push(String(chunk));
			cb();
		}
	});
	return { log: pino(loggerOptions, stream), lines };
}

describe('scrubLog', () => {
	it('rewrites meeting and participant path segments', () => {
		const meeting = newId();
		const participant = newId();
		expect(scrubLog(`/m/${meeting}`)).toBe('/m/[id]');
		expect(scrubLog(`/api/m/${meeting}/r/${participant}`)).toBe('/api/m/[id]/r/[id]');
	});
});

describe('scrubValue', () => {
	it('redacts id-keyed fields and drops IP fields', () => {
		const meeting = newId();
		expect(scrubValue({ id: meeting, path: `/m/${meeting}`, ip: '203.0.113.9' })).toEqual({
			id: '[id]',
			path: '/m/[id]'
		});
	});
});

describe('pino serializers', () => {
	it('never writes a raw meeting id to the stream', () => {
		const meeting = newId();
		const { log, lines } = collect();
		log.info({ path: `/m/${meeting}?from=share` }, `GET /m/${meeting}`);
		const out = lines.join('');
		expect(out).not.toContain(meeting);
		expect(out).toContain('/m/[id]');
	});
});
