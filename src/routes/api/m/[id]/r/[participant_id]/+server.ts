import type { RequestHandler } from './$types';
import { notifyMeeting } from '$lib/server/live';
import { apiResponse } from '$lib/server/meetings';
import { deleteResponse, putResponse } from '$lib/server/responses';

export const PUT: RequestHandler = async ({ params, request, getClientAddress }) => {
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		raw = null;
	}
	const result = await putResponse(params.id, params.participant_id, raw, getClientAddress());
	if (result.ok) await notifyMeeting(params.id);
	return apiResponse(result);
};

export const DELETE: RequestHandler = async ({ params, getClientAddress }) => {
	const result = await deleteResponse(params.id, params.participant_id, getClientAddress());
	if (result.ok) await notifyMeeting(params.id);
	return apiResponse(result);
};
