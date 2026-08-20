/** User-facing copy. Error one-liners from PRD §15.7. */

export const COPY = {
	notFound: "That link doesn't work. Check you copied all of it.",
	over60: "That's more than 60 days. Pick a shorter stretch.",
	rateLimited: 'Too many at once. Try in a minute.',
	full: "This one's full at 50 people.",
	contact: 'First name and initial is plenty.',
	offline: "Not saved — you're offline.",
	linkWarning: "This link is the only way back in. We can't recover it and neither can you."
} as const;
