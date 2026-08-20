import type { RequestHandler } from './$types';
import { apiResponse, getMeeting } from '$lib/server/meetings';

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
	return apiResponse(await getMeeting(params.id, getClientAddress()));
};
