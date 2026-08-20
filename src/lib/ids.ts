/** 128-bit CSPRNG capability ids + the log scrubber (TECH-STACK §6, PRD §6.2). */

const ID_BYTES = 16;
const ID_LENGTH = 22;

/** Exactly 22 chars, base64url alphabet. Same shape Caddy filters. */
const ID_SHAPE = /^[A-Za-z0-9_-]{22}$/;

/**
 * Must stay in step with `ops/Caddyfile`:
 * `regexp "/m/[A-Za-z0-9_-]{22}" "/m/[id]"`.
 * Lookahead stops a longer token from being partially rewritten.
 */
const SCRUB_RE = /\/m\/[A-Za-z0-9_-]{22}(?![A-Za-z0-9_-])/g;

function bytesToBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i++) {
		bin += String.fromCharCode(bytes[i]!);
	}
	return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** 16 CSPRNG bytes → base64url, 22 chars, no padding. Not `randomUUID()`. */
export function newId(): string {
	const bytes = new Uint8Array(ID_BYTES);
	crypto.getRandomValues(bytes);
	return bytesToBase64Url(bytes);
}

/** Exactly 22 chars, base64url alphabet, nothing else. */
export function isValidId(s: string): boolean {
	return s.length === ID_LENGTH && ID_SHAPE.test(s);
}

/** `/m/{id}` → `/m/[id]`. Leaves non-id paths alone. */
export function scrub(s: string): string {
	return s.replace(SCRUB_RE, '/m/[id]');
}
