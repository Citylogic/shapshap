/**
 * Rate-limit bucket key from a client address (INFRASTRUCTURE §3).
 * v4 /32 (the address), v6 /64. IPs stay in memory only — never persist or log.
 */

const V4 = /^(\d{1,3})(?:\.(\d{1,3})){3}$/;
const V4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

function strip(address: string): string {
	let ip = address.trim();
	if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
	const zone = ip.indexOf('%');
	if (zone !== -1) ip = ip.slice(0, zone);
	return ip;
}

function hextets(ip: string): string[] | null {
	if (ip.includes('.')) return null;
	const halves = ip.split('::');
	if (halves.length > 2) return null;
	const head = halves[0] === '' || halves[0] === undefined ? [] : halves[0].split(':');
	const tail =
		halves.length === 1 || halves[1] === '' || halves[1] === undefined ? [] : halves[1].split(':');
	if (head.some((h) => h === '') || tail.some((h) => h === '')) return null;
	const missing = 8 - head.length - tail.length;
	if (halves.length === 2) {
		if (missing < 0) return null;
	} else if (head.length !== 8) {
		return null;
	}
	const zeros = Array.from({ length: Math.max(0, missing) }, () => '0');
	const parts = [...head, ...zeros, ...tail];
	if (parts.length !== 8) return null;
	if (!parts.every((p) => /^[0-9a-fA-F]{1,4}$/.test(p))) return null;
	return parts.map((p) => p.toLowerCase().padStart(4, '0'));
}

/** Canonical bucket key. Unparseable input shares one bucket so we still limit. */
export function ipBucketKey(address: string): string {
	const ip = strip(address);
	if (!ip) return 'unknown';

	const mapped = V4_MAPPED.exec(ip);
	if (mapped?.[1]) return mapped[1];

	if (V4.test(ip)) return ip;

	const parts = hextets(ip);
	if (!parts) return 'unknown';
	return parts.slice(0, 4).join(':');
}
