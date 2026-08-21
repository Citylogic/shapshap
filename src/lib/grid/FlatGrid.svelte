<script lang="ts">
	import type { GridModel } from './model';
	import { paintIndex, slotIndexFromPoint, type PaintMode } from './paint';
	import { clearDay, columnsOf, formatHoursSelected, isToday, selectedCountForDay } from './flat';

	type Props = {
		model: GridModel;
		/** Parent-owned painted indexes (return visit / takeover / live paint). */
		slots?: readonly number[];
		/** 0–4 per slot index; paint (`on`) sits on top. */
		density?: readonly number[];
		slotMinutes?: number;
		today?: string;
		/** First visible day index; omit `pageSize` to show every column. */
		pageStart?: number;
		pageSize?: number;
		best?: ReadonlySet<number>;
		onChange?: (selected: ReadonlySet<number>) => void;
		onPeek?: (index: number | null) => void;
	};

	let {
		model,
		slots = [],
		density = [],
		slotMinutes = 30,
		today = '',
		pageStart = 0,
		pageSize,
		best = new Set(),
		onChange,
		onPeek
	}: Props = $props();

	let allColumns = $derived(columnsOf(model));
	let columns = $derived(
		pageSize == null ? allColumns : allColumns.slice(pageStart, pageStart + pageSize)
	);
	let fromParent = $derived(new Set(slots));
	let peekSticky = false;
	/** Bumped on paint so the template rereads `live` during a drag. */
	let paintTick = $state(0);
	/** Mirror of painted indexes; $state does not flush inside a synchronous walk. */
	let live = new Set<number>();
	let painting = false;
	let mode: PaintMode = 'on';
	let lastX = 0;
	let lastY = 0;

	function current(): ReadonlySet<number> {
		return paintTick >= 0 && painting ? live : fromParent;
	}

	function commit(next: Set<number>) {
		live = next;
		paintTick += 1;
		onChange?.(next);
	}

	function apply(index: number) {
		if (mode === 'on' ? live.has(index) : !live.has(index)) return;
		commit(paintIndex(live, index, mode));
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
		live = new Set(fromParent);
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

	function onClear(dayIndex: number) {
		const col = columns[dayIndex];
		if (!col) return;
		painting = false;
		commit(clearDay(current(), col.cells));
	}
</script>

<div class="days" role="grid" aria-colcount={columns.length}>
	{#each columns as col (col.dayIndex)}
		{@const picked = selectedCountForDay(current(), col.cells)}
		<section class="day" role="group" aria-label="{col.header.weekday} {col.header.date}">
			<header class="head">
				<p class="wk">
					<span class="name">{col.header.weekday}</span>
					{#if picked > 0}
						<span class="tick" aria-hidden="true">✓</span>
					{/if}
				</p>
				<p class="when">
					<span class="num">{col.header.date}</span>
					{#if today && isToday(col.day.date, today)}
						<span class="today">· TODAY</span>
					{/if}
				</p>
				<p class="meta">
					<span>{formatHoursSelected(picked, slotMinutes)}</span>
					<button
						type="button"
						class="clear"
						disabled={picked === 0}
						onpointerdown={(e) => e.stopPropagation()}
						onclick={() => onClear(col.dayIndex)}
					>
						Clear
					</button>
				</p>
			</header>
			<div
				class="lanes"
				role="group"
				aria-label="{col.header.weekday} times"
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerEnd}
				onpointercancel={onPointerEnd}
				onlostpointercapture={onPointerEnd}
				onpointerleave={onPointerLeave}
			>
				{#each col.cells as cell (cell.index)}
					{@const time = model.times[cell.slotInDay]}
					{@const on = cell.exists && current().has(cell.index)}
					{@const level = cell.exists ? (density[cell.index] ?? 0) : 0}
					{@const isBest = cell.exists && best.has(cell.index)}
					<div
						class="cell"
						class:gap={!cell.exists}
						class:on
						class:d1={level === 1}
						class:d2={level === 2}
						class:d3={level === 3}
						class:d4={level === 4}
						role="gridcell"
						aria-disabled={!cell.exists ? true : undefined}
						aria-selected={on}
						aria-label={time
							? `${col.header.weekday} ${col.header.date}, ${time.time}${isBest ? ', Best' : ''}`
							: undefined}
						data-slot={cell.exists ? String(cell.index) : undefined}
						data-density={level || undefined}
						data-best={isBest ? '' : undefined}
					>
						{#if on}
							<span class="mark" aria-hidden="true">✓</span>
						{/if}
						{#if time}
							<span class="hm">{time.time}</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.days {
		display: flex;
		gap: var(--space-5);
		overflow-x: auto;
		padding: var(--space-2) 0 var(--space-4);
		-webkit-overflow-scrolling: touch;
		user-select: none;
	}

	.day {
		flex: 0 0 auto;
		width: min(12.5rem, 72vw);
		min-width: 10.5rem;
	}

	.head {
		margin: 0 0 var(--space-3);
	}

	.wk,
	.when,
	.meta {
		margin: 0;
	}

	.wk {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.tick {
		color: var(--accent);
		font-size: 0.85rem;
	}

	.when {
		margin-top: 0.15rem;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.today {
		font-weight: 700;
	}

	.meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		margin-top: var(--space-2);
		color: var(--muted);
		font-size: 0.75rem;
	}

	.clear {
		appearance: none;
		border: 0;
		padding: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 650;
		cursor: pointer;
	}

	.clear:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.lanes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.35rem;
		touch-action: none;
		cursor: pointer;
	}

	.cell {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 2.75rem;
		padding: 0 0.45rem;
		border-radius: 0.4rem;
		background: var(--density-0);
		color: var(--ink);
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		font-weight: 550;
	}

	.cell.gap {
		background: var(--bg-soft);
		background-image: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 4px,
			rgb(0 0 0 / 0.04) 4px,
			rgb(0 0 0 / 0.04) 5px
		);
		color: var(--faint);
		pointer-events: none;
	}

	.cell.d1 {
		background: var(--density-1);
	}

	.cell.d2 {
		background: var(--density-2);
	}

	.cell.d3 {
		background: var(--density-3);
	}

	.cell.d4 {
		background: var(--density-4);
		color: var(--accent-ink);
	}

	.cell.on {
		background: var(--self);
		color: var(--accent-ink);
	}

	.mark {
		flex-shrink: 0;
		font-size: 0.7rem;
		line-height: 1;
	}

	.hm {
		min-width: 0;
	}
</style>
