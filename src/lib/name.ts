/**
 * First + last name. Client and server share this so the entry modal can
 * reject before send and the PUT handler still enforces it (PRD §5.2, §10).
 */

export const NAME_MAX = 40;

/** Email-like: anything with `@`. A display name never needs it. */
const EMAIL_LIKE = /@/;

/**
 * Phone-like: the whole string is digits plus phone punctuation, and
 * there are enough digits to be a number rather than "Thabo 2".
 */
const PHONE_CHARS = /^[+]?[\d\s().-]+$/;

export type NameParse =
	{ ok: true; name: string } | { ok: false; reason: 'length' | 'contact' | 'missing' };

export function looksLikeContact(name: string): boolean {
	if (EMAIL_LIKE.test(name)) return true;
	const digits = name.replace(/\D/g, '');
	return digits.length >= 7 && PHONE_CHARS.test(name.trim());
}

/** Two-letter initials from the first and last words of a display name. */
export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0];
	const last = parts.length >= 2 ? parts[parts.length - 1]?.[0] : undefined;
	if (!first || !last) return '';
	return (first + last).toUpperCase();
}

/** First + last required. Empty / one word → missing. Contact-shaped or over cap → reject. */
export function parseName(raw: string | null | undefined): NameParse {
	if (raw == null) return { ok: false, reason: 'missing' };
	const name = raw.trim().replace(/\s+/g, ' ');
	if (name === '') return { ok: false, reason: 'missing' };
	if (looksLikeContact(name)) return { ok: false, reason: 'contact' };
	const parts = name.split(' ');
	if (parts.length < 2) return { ok: false, reason: 'missing' };
	if (name.length > NAME_MAX) return { ok: false, reason: 'length' };
	return { ok: true, name };
}
