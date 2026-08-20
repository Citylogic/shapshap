/** Cell index attribute used for `elementFromPoint` hit-testing. */
export const SLOT_ATTR = 'data-slot';

export type PaintMode = 'on' | 'off';

/** Hit-test the cell under the pointer. One query, not a listener per cell. */
export function slotIndexFromPoint(x: number, y: number): number | null {
	const el = document.elementFromPoint(x, y);
	if (!(el instanceof Element)) return null;
	const host = el.closest(`[${SLOT_ATTR}]`);
	if (!host) return null;
	const raw = host.getAttribute(SLOT_ATTR);
	if (raw == null) return null;
	const n = Number(raw);
	return Number.isInteger(n) && n >= 0 ? n : null;
}

export function paintIndex(
	selected: ReadonlySet<number>,
	index: number,
	mode: PaintMode
): Set<number> {
	const next = new Set(selected);
	if (mode === 'on') next.add(index);
	else next.delete(index);
	return next;
}
