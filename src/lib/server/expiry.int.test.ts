import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newId } from '../ids';
import { migrate } from './migrate';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error('DATABASE_URL is required for pnpm test:int');
}

const EXPIRE = 'DELETE FROM meetings WHERE expires_at < now()';

describe('expiry deletion', () => {
	const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

	beforeAll(async () => {
		await migrate(sql);
	});

	afterAll(async () => {
		await sql.end();
	});

	it('hard-deletes expired meetings and cascaded responses', async () => {
		await sql`TRUNCATE meetings CASCADE`;

		const meetingId = newId();
		const participantId = newId();

		await sql`
			INSERT INTO meetings (id, starts_on, ends_on, window_start, window_end, tz, expires_at)
			VALUES (
				${meetingId},
				'2026-08-17',
				'2026-08-21',
				'08:00',
				'20:00',
				'Africa/Johannesburg',
				'2000-01-01T00:00:00Z'
			)
		`;
		await sql`
			INSERT INTO responses (meeting_id, participant_id, name, slots)
			VALUES (${meetingId}, ${participantId}, ${'Ada L'}, ARRAY[0, 1, 2])
		`;

		await sql.unsafe(EXPIRE);

		const meetingRows = await sql<{ meetings: number }[]>`
			SELECT count(*)::int AS meetings FROM meetings
		`;
		const responseRows = await sql<{ responses: number }[]>`
			SELECT count(*)::int AS responses FROM responses
		`;
		expect(meetingRows[0]?.meetings).toBe(0);
		expect(responseRows[0]?.responses).toBe(0);
	});

	it('schema has no title or email columns', async () => {
		const sqlFile = readFileSync(resolve('db/migrations/001_init.sql'), 'utf8');
		expect(sqlFile).not.toMatch(/\btitle\b/i);
		expect(sqlFile).not.toMatch(/\bemail\b/i);

		const cols = await sql<{ column_name: string }[]>`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name IN ('meetings', 'responses')
		`;
		const names = cols.map((c) => c.column_name);
		expect(names).not.toContain('title');
		expect(names).not.toContain('email');
		expect(names).toContain('expires_at');
		expect(names).toContain('slots');
	});
});
