<script lang="ts">
	import type { GridModel } from './model';
	import { paintIndex, slotIndexFromPoint, type PaintMode } from './paint';

	type Props = {
		model: GridModel;
		/** When set, the parent owns the painted set (return visit / takeover). */
		selection?: ReadonlySet<number>;
		/** 0–4 per slot index; paint (`on`) sits on top. */
		density?: readonly number[];
		best?: ReadonlySet<number>;
		onChange?: (selected: ReadonlySet<number>) => void;
		onPeek?: (index: number | null) => void;
	};

	let { model, selection, density = [], best = new Set(), onChange, onPeek }: Props = $props();
	let peekSticky = false;

	let selected = $state(new Set<number>());
	/** Mirror of `selected`; $state does not flush inside a synchronous paint walk. */
	let live = new Set<number>();
	let painting = false;
	let mode: PaintMode = 'on';
	let lastX = 0;
	let lastY = 0;

	function current(): ReadonlySet<number> {
		if (painting) return live;
		return selection ?? selected;
	}

	function apply(index: number) {
		if (mode === 'on' ? live.has(index) : !live.has(index)) return;
		live = paintIndex(live, index, mode);
		selected = live;
		onChange?.(live);
	}

	function paintAt(x: number, y: number) {
		const index = slotIndexFromPoint(x, y);
		if (index != null) apply(index);
	}

	/** Walk the segment so a fast pointermove cannot skip cells. */
	function paintAlong(x0: number, y0: number, x1: number, y1: number) {
		const dx = x1 - x0;
		const dy = y1 - y0;
		const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
		for (let i = 1; i <= steps; i++) {
			const t = i / steps;
			paintAt(x0 + dx * t, y0 + dy * t);
		}
	}

	function peekAt(x: number, y: number) {
		onPeek?.(slotIndexFromPoint(x, y));
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		const index = slotIndexFromPoint(e.clientX, e.clientY);
		if (index == null) return;
		e.preventDefault();
		painting = true;
		peekSticky = e.pointerType !== 'mouse';
		onPeek?.(index);
		live = new Set(selection ?? selected);
		mode = live.has(index) ? 'off' : 'on';
		apply(index);
		lastX = e.clientX;
		lastY = e.clientY;
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			// Synthetic or already-released pointers; move/up still flow if the browser sends them.
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!painting) {
			peekAt(e.clientX, e.clientY);
			return;
		}
		paintAlong(lastX, lastY, e.clientX, e.clientY);
		peekAt(e.clientX, e.clientY);
		lastX = e.clientX;
		lastY = e.clientY;
	}

	function onPointerLeave() {
		if (!painting && !peekSticky) onPeek?.(null);
	}

	function onPointerEnd(e: PointerEvent) {
		if (!painting) return;
		painting = false;
		const t = e.currentTarget as HTMLElement;
		if (t.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId);
	}
</script>

<div
	class="grid"
	style:--days={model.days.length}
	style:--slots={model.slotsPerDay}
	role="grid"
	aria-rowcount={model.slotsPerDay}
	aria-colcount={model.days.length}
>
	<div class="origin"></div>
	{#each model.days as day, i (i)}
		<div class="day" role="columnheader" style:grid-column={i + 2} style:grid-row={1}>
			<span class="wk">{day.weekday}</span>
			<span class="num">{day.day}</span>
		</div>
	{/each}
	{#each model.times as t, i (i)}
		<div class="time" role="rowheader" style:grid-column={1} style:grid-row={i + 2}>
			{t.label}
		</div>
	{/each}
	<div
		class="surface"
		role="group"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerEnd}
		onpointercancel={onPointerEnd}
		onlostpointercapture={onPointerEnd}
		onpointerleave={onPointerLeave}
	>
		{#each model.cells as cell (cell.index)}
			{@const day = model.days[cell.dayIndex]}
			{@const time = model.times[cell.slotInDay]}
			{@const on = cell.exists && current().has(cell.index)}
			{@const level = cell.exists ? (density[cell.index] ?? 0) : 0}
			{@const isBest = cell.exists && best.has(cell.index)}
			<div
				class="cell"
				class:gap={!cell.exists}
				class:on
				class:best={isBest}
				class:d1={level === 1}
				class:d2={level === 2}
				class:d3={level === 3}
				class:d4={level === 4}
				style:grid-column={cell.dayIndex + 1}
				style:grid-row={cell.slotInDay + 1}
				role="gridcell"
				aria-disabled={!cell.exists ? true : undefined}
				aria-selected={on}
				aria-label={day && time
					? `${day.weekday} ${day.day}, ${time.time}${isBest ? ', Best' : ''}`
					: undefined}
				data-slot={cell.exists ? String(cell.index) : undefined}
				data-density={level || undefined}
				data-best={isBest ? '' : undefined}
			>
				{#if isBest}
					<span class="badge" aria-hidden="true">Best</span>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.grid {
		--grid-bg: #f3efe6;
		--grid-ink: #1c1a16;
		--grid-muted: #8a8578;
		--grid-line: #d9d3c6;
		--grid-cell: #fffcf5;
		--grid-self: #2c6b4a;
		--grid-gap: #e7e2d6;
		--grid-density-1: #c9e2d3;
		--grid-density-2: #8fbfa3;
		--grid-density-3: #5a9978;
		--grid-density-4: #2c6b4a;
		--slot-h: 2.75rem;
		--day-min: 3.15rem;
		--label-w: 3.35rem;
		--head-h: 2.5rem;
		display: grid;
		grid-template-columns: var(--label-w) repeat(var(--days), minmax(var(--day-min), 1fr));
		grid-template-rows: var(--head-h) repeat(var(--slots), var(--slot-h));
		width: max-content;
		min-width: 100%;
		background: var(--grid-line);
		gap: 1px;
		color: var(--grid-ink);
		font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		font-size: 0.75rem;
		line-height: 1.2;
		user-select: none;
	}

	.origin,
	.day,
	.time {
		background: var(--grid-bg);
	}

	.origin {
		position: sticky;
		top: 0;
		left: 0;
		z-index: 3;
		grid-column: 1;
		grid-row: 1;
	}

	.day {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		font-variant-numeric: tabular-nums;
	}

	.wk {
		color: var(--grid-muted);
		font-size: 0.65rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.num {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.time {
		position: sticky;
		left: 0;
		z-index: 1;
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		padding: 0.2rem 0.4rem 0 0;
		color: var(--grid-muted);
		font-variant-numeric: tabular-nums;
	}

	.surface {
		display: grid;
		grid-column: 2 / -1;
		grid-row: 2 / -1;
		grid-template-columns: subgrid;
		grid-template-rows: subgrid;
		gap: 1px;
		touch-action: none;
		cursor: pointer;
	}

	.cell {
		position: relative;
		min-width: var(--day-min);
		min-height: var(--slot-h);
		background: var(--grid-cell);
	}

	.cell.gap {
		background: var(--grid-gap);
		background-image: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 4px,
			rgb(0 0 0 / 0.04) 4px,
			rgb(0 0 0 / 0.04) 5px
		);
	}

	.cell.d1 {
		background: var(--grid-density-1);
	}

	.cell.d2 {
		background: var(--grid-density-2);
	}

	.cell.d3 {
		background: var(--grid-density-3);
	}

	.cell.d4 {
		background: var(--grid-density-4);
	}

	.cell.on {
		background: var(--grid-self);
	}

	.badge {
		position: absolute;
		top: 0.15rem;
		left: 0.2rem;
		color: var(--grid-ink);
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1;
		pointer-events: none;
	}

	.cell.on .badge,
	.cell.d3 .badge,
	.cell.d4 .badge {
		color: var(--grid-cell);
	}
</style>
