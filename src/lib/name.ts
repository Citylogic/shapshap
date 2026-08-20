/**
 * First name + initial. Client and server share this so S11 can reject
 * before send and S08 still enforces it (PRD §5.2, TECH-STACK §4.1).
 */

export const NAME_MAX = 24;

/** Email-like: anything with `@`. First name + initial never needs it. */
const EMAIL_LIKE = /@/;

/**
 * Phone-like: the whole string is digits plus phone punctuation, and
 * there are enough digits to be a number rather than "Thabo 2".
 */
const PHONE_CHARS = /^[+]?[\d\s().-]+$/;

export type NameParse =
	{ ok: true; name: string | null } | { ok: false; reason: 'length' | 'contact' };

export function looksLikeContact(name: string): boolean {
	if (EMAIL_LIKE.test(name)) return true;
	const digits = name.replace(/\D/g, '');
	return digits.length >= 7 && PHONE_CHARS.test(name.trim());
}

/** Optional name. Empty → null. Contact-shaped or over 24 → reject. */
export function parseName(raw: string | null | undefined): NameParse {
	if (raw == null) return { ok: true, name: null };
	const name = raw.trim();
	if (name === '') return { ok: true, name: null };
	if (name.length > NAME_MAX) return { ok: false, reason: 'length' };
	if (looksLikeContact(name)) return { ok: false, reason: 'contact' };
	return { ok: true, name };
}
