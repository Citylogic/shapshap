import type { RequestHandler } from './$types';
import { subscribeLive } from '$lib/server/live';
import { apiResponse, getMeeting, type ResponseJson } from '$lib/server/meetings';

export const GET: RequestHandler = async ({ params, getClientAddress }) => {
	const initial = await getMeeting(params.id, getClientAddress());
	if (!initial.ok) return apiResponse(initial);

	const meetingId = params.id;
	const encoder = new TextEncoder();
	let unsubscribe = (): void => {};
	let beat: ReturnType<typeof setInterval> | undefined;

	const stream = new ReadableStream({
		start(controller) {
			const send = (responses: readonly ResponseJson[]) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ responses })}\n\n`));
				} catch {
					unsubscribe();
				}
			};
			unsubscribe = subscribeLive(meetingId, send);
			send(initial.body.responses);
			beat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: ping\n\n`));
				} catch {
					unsubscribe();
					if (beat) clearInterval(beat);
				}
			}, 25_000);
		},
		cancel() {
			unsubscribe();
			if (beat) clearInterval(beat);
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive',
			'x-accel-buffering': 'no'
		}
	});
};
