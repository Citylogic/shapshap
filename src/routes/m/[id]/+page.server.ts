import { COPY } from '$lib/copy';
import { buildGridModel } from '$lib/grid/model';
import { getMeeting, type MeetingJson } from '$lib/server/meetings';
import type { MeetingWindow } from '$lib/time';
import type { PageServerLoad } from './$types';

function windowOf(meeting: MeetingJson): MeetingWindow {
	return {
		startsOn: meeting.starts_on,
		endsOn: meeting.ends_on,
		windowStart: meeting.window_start,
		windowEnd: meeting.window_end,
		tz: meeting.tz,
		slotMinutes: meeting.slot_minutes
	};
}

export const load: PageServerLoad = async ({ params, getClientAddress }) => {
	const result = await getMeeting(params.id, getClientAddress());
	if (!result.ok) {
		if (result.status === 429) {
			return { status: 'limited' as const, message: result.body.error };
		}
		return { status: 'missing' as const, message: COPY.notFound };
	}

	const { meeting, responses } = result.body;
	if (
		Temporal.Instant.compare(Temporal.Now.instant(), Temporal.Instant.from(meeting.expires_at)) >= 0
	) {
		return { status: 'gone' as const };
	}

	return {
		status: 'ok' as const,
		meeting,
		responses,
		model: buildGridModel(windowOf(meeting))
	};
};
