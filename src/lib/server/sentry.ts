/**
 * Server-side Sentry only (TECH-STACK §8, INFRASTRUCTURE §5.1).
 * No browser SDK — that would need a CSP ingest hole and blow the 60 KB gate.
 * `SENTRY_DSN` is optional; boot is a no-op when it is unset.
 */

import * as Sentry from '@sentry/node';
import { scrubValue } from './log';

export function scrubSentryEvent<T>(event: T): T {
	return scrubValue(event) as T;
}

export function initSentry(): void {
	const dsn = process.env.SENTRY_DSN;
	if (!dsn) return;
	Sentry.init({
		dsn,
		sendDefaultPii: false,
		tracesSampleRate: 0,
		integrations(integrations) {
			return integrations.filter((i) => {
				const name = i.name;
				return name !== 'Postgres' && name !== 'PostgresJs' && name !== 'Http';
			});
		},
		beforeSend(event) {
			return scrubSentryEvent(event);
		}
	});
}

export function captureException(error: unknown): void {
	if (!process.env.SENTRY_DSN) return;
	Sentry.captureException(error);
}
