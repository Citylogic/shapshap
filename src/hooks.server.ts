import { building } from '$app/environment';
import type { ServerInit } from '@sveltejs/kit';
import { getSql } from '$lib/server/db';
import { migrate } from '$lib/server/migrate';

/** Apply numbered migrations on process start (TECH-STACK §4). */
export const init: ServerInit = async () => {
	if (building) return;
	await migrate(getSql());
};
