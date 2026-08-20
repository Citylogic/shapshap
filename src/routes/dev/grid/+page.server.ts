import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { GRID_FIXTURE, GRID_STRESS_FIXTURE } from '$lib/grid/fixture';
import { buildGridModel } from '$lib/grid/model';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = ({ url }) => {
	if (!dev) error(404);
	const fixture = url.searchParams.get('days') === '60' ? GRID_STRESS_FIXTURE : GRID_FIXTURE;
	return { model: buildGridModel(fixture) };
};
