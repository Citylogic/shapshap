export type LegalDoc = 'why' | 'terms' | 'privacy';

/** Which legal document is open over the current page. Stays null until a click. */
export const legalModal = $state({
	doc: null as LegalDoc | null
});

export function openLegal(doc: LegalDoc) {
	legalModal.doc = doc;
}

export function closeLegal() {
	legalModal.doc = null;
}
