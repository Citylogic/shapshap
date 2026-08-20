/**
 * Pino logger with the id scrubber on every string (TECH-STACK §6, INFRASTRUCTURE §6).
 * Never log a meeting id, participant id, name, or IP.
 */

import pino, { type LoggerOptions } from 'pino';
import { isValidId, scrub } from '$lib/ids';

const PARTICIPANT_PATH = /\/r\/[A-Za-z0-9_-]{22}(?![A-Za-z0-9_-])/g;
const ID_KEYS = /^(id|meeting[_-]?id|participant[_-]?id)$/i;
const IP_KEYS =
	/^(ip|ip_address|address|remoteAddress|clientIp|clientAddress|remote_ip|client_ip)$/i;

/** Paths through `scrub()`, plus `/r/{participant}` so PUT URLs are safe to log. */
export function scrubLog(s: string): string {
	return scrub(s).replace(PARTICIPANT_PATH, '/r/[id]');
}

export function scrubValue(value: unknown, key?: string): unknown {
	if (value == null) return value;
	if (typeof value === 'string') {
		if (key && ID_KEYS.test(key) && isValidId(value)) return '[id]';
		return scrubLog(value);
	}
	if (typeof value !== 'object') return value;
	if (value instanceof Error) {
		return {
			type: value.name,
			message: scrubLog(value.message),
			stack: value.stack ? scrubLog(value.stack) : undefined
		};
	}
	if (Array.isArray(value)) return value.map((item) => scrubValue(item));
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		if (IP_KEYS.test(k)) continue;
		out[k] = scrubValue(v, k);
	}
	return out;
}

export const loggerOptions: LoggerOptions = {
	base: undefined,
	serializers: {
		err: (err: unknown) => scrubValue(err) as Record<string, unknown>
	},
	hooks: {
		logMethod(args, method) {
			method.apply(this, args.map((a) => scrubValue(a)) as typeof args);
		},
		streamWrite(s) {
			return scrubLog(s);
		}
	}
};

function destination() {
	const path = process.env.LOG_PATH;
	const stdout = pino.destination({ dest: 1, sync: true });
	if (!path) return stdout;
	return pino.multistream([
		{ stream: stdout },
		{ stream: pino.destination({ dest: path, sync: true, mkdir: true }) }
	]);
}

export const log = pino(loggerOptions, destination());
