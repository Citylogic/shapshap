import { building } from '$app/environment';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { getSql } from '$lib/server/db';
import { log } from '$lib/server/log';
import { migrate } from '$lib/server/migrate';
import { captureException, initSentry } from '$lib/server/sentry';

/** Apply numbered migrations on process start (TECH-STACK §4). */
export const init: ServerInit = async () => {
	initSentry();
	if (building) return;
	await migrate(getSql());
};

export const handle: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const response = await resolve(event);
	response.headers.set('Referrer-Policy', 'no-referrer');
	response.headers.delete('x-powered-by');
	if (event.url.pathname !== '/api/health') {
		log.info({
			method: event.request.method,
			path: event.url.pathname + event.url.search,
			status: response.status,
			ms: Date.now() - start
		});
	}
	return response;
};

export const handleError: HandleServerError = ({ error, event, status }) => {
	captureException(error);
	log.error({ err: error, path: event.url.pathname, status });
	return { message: 'Something went wrong' };
};
