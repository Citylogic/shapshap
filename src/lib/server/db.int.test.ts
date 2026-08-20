import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { endSql, getSql } from './db';
import { migrate } from './migrate';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error('DATABASE_URL is required for pnpm test:int');
}

describe('db client', () => {
	const sql = getSql();

	beforeAll(async () => {
		await migrate(sql);
	});

	afterAll(async () => {
		await endSql();
	});

	it('applies numbered migrations through the app client', async () => {
		const rows = await sql<{ filename: string }[]>`
			SELECT filename FROM schema_migrations ORDER BY filename
		`;
		expect(rows.map((r) => r.filename)).toContain('001_init.sql');
	});
});
