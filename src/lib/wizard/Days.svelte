<script lang="ts">
	import {
		WEEKDAYS,
		addMonths,
		inRange,
		monthCells,
		monthLabel,
		orderRange,
		type DayRange
	} from './days';

	type Props = {
		range: DayRange | null;
		onRange: (range: DayRange) => void;
	};

	let { range, onRange }: Props = $props();

	const now = new Date();
	let year = $state(now.getFullYear());
	let month = $state(now.getMonth() + 1);

	let cells = $derived(monthCells(year, month));
	let label = $derived(monthLabel(year, month));

	let dragging = false;
	let anchor: string | null = null;
	/** Pointer paint already handled this gesture; ignore the trailing click. */
	let pointerHandled = false;

	function dateFromPoint(x: number, y: number): string | null {
		const el = document.elementFromPoint(x, y);
		if (!(el instanceof Element)) return null;
		return el.closest('[data-date]')?.getAttribute('data-date') ?? null;
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		const date = dateFromPoint(e.clientX, e.clientY);
		if (!date) return;
		e.preventDefault();
		pointerHandled = true;
		dragging = true;
		anchor = date;
		onRange(orderRange(date, date));
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			// Synthetic or already-released pointers.
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging || !anchor) return;
		const date = dateFromPoint(e.clientX, e.clientY);
		if (date) onRange(orderRange(anchor, date));
	}

	function onPointerEnd(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		anchor = null;
		const t = e.currentTarget as HTMLElement;
		if (t.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId);
	}

	function pickDay(date: string) {
		if (pointerHandled) {
			pointerHandled = false;
			return;
		}
		onRange(orderRange(date, date));
	}

	function shift(delta: number) {
		const next = addMonths(year, month, delta);
		year = next.year;
		month = next.month;
	}
</script>

<div class="cal">
	<div class="nav">
		<button type="button" class="shift" onclick={() => shift(-1)} aria-label="Previous month">
			←
		</button>
		<p class="label">{label}</p>
		<button type="button" class="shift" onclick={() => shift(1)} aria-label="Next month">→</button>
	</div>
	<div class="wk" aria-hidden="true">
		{#each WEEKDAYS as w (w)}
			<span>{w}</span>
		{/each}
	</div>
	<div
		class="days"
		role="group"
		aria-label={label}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerEnd}
		onpointercancel={onPointerEnd}
		onlostpointercapture={onPointerEnd}
	>
		{#each cells as cell (cell.date)}
			{@const on = range ? inRange(cell.date, range) : false}
			<button
				type="button"
				class="day"
				class:out={!cell.inMonth}
				class:on
				class:start={on && range?.start === cell.date}
				class:end={on && range?.end === cell.date}
				data-date={cell.date}
				data-in-month={cell.inMonth ? '' : undefined}
				aria-pressed={on}
				aria-label={cell.date}
				onclick={() => pickDay(cell.date)}
			>
				{cell.day}
			</button>
		{/each}
	</div>
</div>

<style>
	.cal {
		user-select: none;
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.label {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.shift {
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		padding: 0.35rem 0.6rem;
		cursor: pointer;
	}

	.wk,
	.days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
	}

	.wk {
		margin-bottom: 0.25rem;
		color: var(--muted);
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-align: center;
	}

	.days {
		gap: 2px;
		touch-action: none;
	}

	.day {
		appearance: none;
		border: 0;
		min-height: 2.75rem;
		padding: 0;
		background: var(--cell);
		color: inherit;
		font: inherit;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
	}

	.day.out {
		color: var(--muted);
		background: transparent;
	}

	.day.on {
		background: var(--self-soft);
		color: var(--ink);
	}

	.day.start,
	.day.end {
		background: var(--self);
		color: #fffcf5;
	}
</style>
