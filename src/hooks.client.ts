/**
 * Safari / WebKit still has no Temporal (TECH-STACK §5, §11.3). Chrome and
 * Firefox keep the native global; this chunk is fetched only when missing.
 */
export async function init(): Promise<void> {
	if (!('Temporal' in globalThis)) {
		await import('temporal-polyfill/global');
	}
}
