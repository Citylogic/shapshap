/** User-facing copy. Error one-liners from PRD §15.7; gone page from §15.5. */

export const COPY = {
	notFound: "That link doesn't work. Check you copied all of it.",
	over60: "That's more than 60 days. Pick a shorter stretch.",
	rateLimited: 'Too many at once. Try in a minute.',
	full: "This one's full at 50 people.",
	contact: 'A name is plenty.',
	offline: "Not saved — you're offline.",
	goneTitle: "This one's gone.",
	goneKeep: 'Meetings are deleted 24 hours after the last time slot.',
	goneArchive: "There's no archive and no copy.",
	goneCta: 'Start a new one →',
	newLink: 'New Shapshap.link'
} as const;

export const REPO = 'github.com/Citylogic/shapshap';

export const WHY_TITLE = 'How it works';

export const WHY_LEAD = 'No accounts, and not much kept.';

export const TERMS_TITLE = 'Terms & Conditions';

export const PRIVACY_TITLE = 'Privacy Policy';

/** Trust note body (PRD §15.6). Wording avoids the §14 banned list. */
export const WHY_BLOCKS = [
	"You never sign in and we never ask for an email address. A meeting is a link. Anyone who has that link can see it, change it, or delete it — including other people's answers. Send it to people you'd meet.",
	"We store the meeting label, the days and times you picked, the name each person types, and the slots they marked. We can read that. It's on one server in London, it isn't sold or shared, and it isn't used for anything except showing you the overlap.",
	"Use your name. The meeting label is visible to anyone with the link — don't put anything there you wouldn't say in the group.",
	"We keep server logs to run the service, with the meeting's ID stripped out of them. We do not log names or meeting label. We rate-limit by IP address to stop abuse; those addresses stay in memory for a minute and aren't stored.",
	'Everything is deleted 24 hours after the last time slot, and gone from our backups within 30 days.',
	"Lose the link and the meeting is gone. There's no recovery, and no way for us to find it for you."
] as const;

export const TERMS_BLOCKS = [
	"A meeting is a link. Anyone who has that link can see it, change it, or delete it — including other people's answers.",
	"We store the meeting label, the days and times you picked, the name each person types, and the slots they marked. We can read that. It's on one server in London, it isn't sold or shared, and it isn't used for anything except showing you the overlap.",
	'Meetings are deleted 24 hours after the last time slot, and gone from backups within 30 days.',
	"Lose the link and the meeting is gone. There's no recovery, and no way for us to find it for you."
] as const;

export const PRIVACY_BLOCKS = [
	'We never ask for an email address, and there is no account.',
	"We store the meeting label, the days and times you picked, the name each person types, and the slots they marked. We can read that. It's on one server in London, it isn't sold or shared, and it isn't used for anything except showing you the overlap.",
	"We keep server logs to run the service, with the meeting's ID stripped out of them. We do not log names or meeting label. We rate-limit by IP address to stop abuse; those addresses stay in memory for a minute and aren't stored.",
	'Everything is deleted 24 hours after the last time slot, and gone from backups within 30 days.'
] as const;
