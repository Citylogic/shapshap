/**
 * Display name. Client and server share this so the entry modal can
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

/** First word is the given name; everything after is the family name. */
export function splitDisplayName(name: string): { first: string; last: string } {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const first = parts[0] ?? '';
	const last = parts.slice(1).join(' ');
	return { first, last };
}

/**
 * Two letters for the respondent badge. One word uses its first two letters.
 * Two or more words use the first letter of the first and last words.
 */
export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const firstWord = parts[0];
	if (!firstWord) return '';
	if (parts.length === 1) return firstWord.slice(0, 2).toUpperCase();
	const lastWord = parts[parts.length - 1];
	const first = firstWord[0];
	const last = lastWord?.[0];
	if (!first || !last) return '';
	return (first + last).toUpperCase();
}

/** Non-empty display name. Contact-shaped or over cap → reject. */
export function parseName(raw: string | null | undefined): NameParse {
	if (raw == null) return { ok: false, reason: 'missing' };
	const name = raw.trim().replace(/\s+/g, ' ');
	if (name === '') return { ok: false, reason: 'missing' };
	if (looksLikeContact(name)) return { ok: false, reason: 'contact' };
	if (name.length > NAME_MAX) return { ok: false, reason: 'length' };
	return { ok: true, name };
}
