import postgres from 'postgres';

/** INFRASTRUCTURE §8: cap the pool well under Postgres `max_connections`. */
const POOL_MAX = 10;

let client: postgres.Sql | undefined;

function databaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is required');
	return url;
}

/** Lazy so `pnpm build` can import hooks without opening a connection. */
export function getSql(): postgres.Sql {
	if (!client) {
		client = postgres(databaseUrl(), { max: POOL_MAX, onnotice: () => {} });
	}
	return client;
}

/** Tests only — close the shared pool so vitest can exit. */
export async function endSql(): Promise<void> {
	if (!client) return;
	const sql = client;
	client = undefined;
	await sql.end();
}
