/** User-facing copy. Error one-liners from PRD §15.7; gone page from §15.5. */

export const COPY = {
	notFound: "That link doesn't work. Check you copied all of it.",
	over60: "That's more than 60 days. Pick a shorter stretch.",
	rateLimited: 'Too many at once. Try in a minute.',
	full: "This one's full at 50 people.",
	contact: 'First name and initial is plenty.',
	offline: "Not saved — you're offline.",
	linkWarning: "This link is the only way back in. We can't recover it and neither can you.",
	goneTitle: "This one's gone.",
	goneKeep: 'Meetings are deleted 24 hours after the last time slot.',
	goneArchive: "There's no archive and no copy.",
	goneCta: 'Start a new one →'
} as const;
