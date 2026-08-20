import type { RequestHandler } from './$types';
import { apiResponse, createMeeting } from '$lib/server/meetings';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		raw = null;
	}
	return apiResponse(await createMeeting(raw, getClientAddress()));
};
