import postgres from 'postgres';

/** INFRASTRUCTURE §8: cap the pool well under Postgres `max_connections`. */
const POOL_MAX = 10;

let client: postgres.Sql | undefined;

/**
 * postgres.js parses the connection string with `new URL`. A raw `/` in the
 * password makes that throw, so encode userinfo only when the string is not
 * already a valid URL.
 */
export function connectionString(raw: string): string {
	try {
		new URL(raw);
		return raw;
	} catch (cause) {
		const match = /^(postgres(?:ql)?:\/\/)([^@]+)@(.*)$/s.exec(raw);
		const scheme = match?.[1];
		const userinfo = match?.[2];
		const rest = match?.[3];
		const colon = userinfo?.indexOf(':') ?? -1;
		if (!scheme || !userinfo || rest === undefined || colon < 0) {
			throw new Error('DATABASE_URL is not a valid URL', { cause });
		}
		const encoded = `${scheme}${encodeURIComponent(userinfo.slice(0, colon))}:${encodeURIComponent(userinfo.slice(colon + 1))}@${rest}`;
		new URL(encoded);
		return encoded;
	}
}

function databaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is required');
	return connectionString(url);
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
