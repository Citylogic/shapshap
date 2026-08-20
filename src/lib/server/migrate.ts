import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type postgres from 'postgres';

const MIGRATIONS_DIR = join(process.cwd(), 'db/migrations');

/** Apply numbered `db/migrations/*.sql` inside one transaction (TECH-STACK §4). */
export async function migrate(sql: postgres.Sql, dir = MIGRATIONS_DIR): Promise<void> {
	const files = (await readdir(dir)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();

	await sql.begin(async (tx) => {
		await tx`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				filename TEXT PRIMARY KEY,
				applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
			)
		`;
		const applied = await tx<{ filename: string }[]>`
			SELECT filename FROM schema_migrations
		`;
		const done = new Set(applied.map((r) => r.filename));

		for (const filename of files) {
			if (done.has(filename)) continue;
			await tx.unsafe(await readFile(join(dir, filename), 'utf8'));
			await tx`INSERT INTO schema_migrations (filename) VALUES (${filename})`;
		}
	});
}
