import type { RequestHandler } from './$types';
import { apiResponse } from '$lib/server/meetings';
import { deleteResponse, putResponse } from '$lib/server/responses';

export const PUT: RequestHandler = async ({ params, request, getClientAddress }) => {
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		raw = null;
	}
	return apiResponse(await putResponse(params.id, params.participant_id, raw, getClientAddress()));
};

export const DELETE: RequestHandler = async ({ params, getClientAddress }) => {
	return apiResponse(await deleteResponse(params.id, params.participant_id, getClientAddress()));
};
