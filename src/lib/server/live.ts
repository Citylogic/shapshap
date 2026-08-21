/**
 * In-process SSE fan-out for `/api/m/[id]/live`. Meeting ids are keys only —
 * never log them, names, or org/label.
 */

import type { ResponseJson } from './meetings';
import { listResponses } from './responses';

export type LiveListener = (responses: readonly ResponseJson[]) => void;

const rooms = new Map<string, Set<LiveListener>>();

export function subscribeLive(meetingId: string, fn: LiveListener): () => void {
	let room = rooms.get(meetingId);
	if (!room) {
		room = new Set();
		rooms.set(meetingId, room);
	}
	room.add(fn);
	return () => {
		room.delete(fn);
		if (room.size === 0) rooms.delete(meetingId);
	};
}

export function publishLive(meetingId: string, responses: readonly ResponseJson[]): void {
	const room = rooms.get(meetingId);
	if (!room) return;
	for (const fn of room) fn(responses);
}

export async function notifyMeeting(meetingId: string): Promise<void> {
	try {
		publishLive(meetingId, await listResponses(meetingId));
	} catch {
		// PUT/DELETE already committed; listeners keep the last snapshot.
	}
}
