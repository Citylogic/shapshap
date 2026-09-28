<script lang="ts">
	import { tick } from 'svelte';
	import { WEEKDAY_SHORT, formatDayLong, formatMonthYear, formatRangeLabel } from '$lib/civil';
	import { dayInRange, monthGrid, orderRange } from '$lib/wizard/calendar';

	type Props = {
		start: string;
		end: string;
	};

	let { start = $bindable(), end = $bindable() }: Props = $props();

	const today = Temporal.Now.plainDateISO().toString();
	const seed = Temporal.PlainDate.from(start);

	let open = $state(false);
	let picking = $state<string | null>(null);
	let hover = $state<string | null>(null);
	let viewYear = $state(seed.year);
	let viewMonth = $state(seed.month);
	let anchor = $state<HTMLDivElement | undefined>();
	let trigger = $state<HTMLButtonElement | undefined>();
	let pop = $state<HTMLDivElement | undefined>();

	let label = $derived(formatRangeLabel(start, end));
	let heading = $derived(formatMonthYear(viewYear, viewMonth));
	let weeks = $derived(open ? monthGrid(viewYear, viewMonth) : []);
	let shown = $derived.by(() => {
		if (picking) return orderRange(picking, hover ?? picking);
		return { start, end };
	});

	const DAY_STEP: Record<string, number> = {
		ArrowLeft: -1,
		ArrowRight: 1,
		ArrowUp: -7,
		ArrowDown: 7
	};

	function mark(iso: string): '' | 'start' | 'end' | 'between' | 'single' {
		if (!dayInRange(iso, shown.start, shown.end)) return '';
		if (shown.start === shown.end) return 'single';
		if (iso === shown.start) return 'start';
		if (iso === shown.end) return 'end';
		return 'between';
	}

	function focusDay(iso: string) {
		pop?.querySelector<HTMLButtonElement>(`[data-iso="${iso}"]`)?.focus();
	}

	function openPicker() {
		const day = Temporal.PlainDate.from(start);
		viewYear = day.year;
		viewMonth = day.month;
		picking = null;
		hover = null;
		open = true;
		void tick().then(() => focusDay(start));
	}

	function closePicker(restoreFocus = false) {
		open = false;
		picking = null;
		hover = null;
		if (restoreFocus) trigger?.focus();
	}

	function toggle() {
		if (open) closePicker();
		else openPicker();
	}

	function shiftMonth(delta: number) {
		const next = Temporal.PlainDate.from({ year: viewYear, month: viewMonth, day: 1 }).add({
			months: delta
		});
		viewYear = next.year;
		viewMonth = next.month;
	}

	function pick(iso: string) {
		if (!picking) {
			picking = iso;
			hover = iso;
			return;
		}
		const next = orderRange(picking, iso);
		start = next.start;
		end = next.end;
		closePicker();
	}

	function hoverDay(iso: string) {
		if (picking) hover = iso;
	}

	async function onGridKey(e: KeyboardEvent) {
		const step = DAY_STEP[e.key];
		if (step == null) return;
		const target = e.target;
		if (!(target instanceof HTMLButtonElement)) return;
		const iso = target.dataset.iso;
		if (!iso) return;
		e.preventDefault();
		const next = Temporal.PlainDate.from(iso).add({ days: step });
		const nextIso = next.toString();
		const visible = weeks.some((week) => week.some((cell) => cell.iso === nextIso));
		if (!visible) {
			viewYear = next.year;
			viewMonth = next.month;
			await tick();
		}
		hoverDay(nextIso);
		focusDay(nextIso);
	}

	$effect(() => {
		if (!open) return;
		const root = anchor;

		function onPointerDown(e: PointerEvent) {
			if (!root || !(e.target instanceof Node) || root.contains(e.target)) return;
			closePicker();
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== 'Escape') return;
			e.preventDefault();
			closePicker(true);
		}

		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

<div class="block">
	<span class="label" id="dates-label">Date Range</span>
	<div class="anchor" bind:this={anchor}>
		<button
			type="button"
			class="field"
			bind:this={trigger}
			aria-labelledby="dates-label dates-value"
			aria-haspopup="dialog"
			aria-expanded={open}
			aria-controls="dates-pop"
			onclick={toggle}
		>
			<span id="dates-value">{label}</span>
			<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
				<rect
					x="3.5"
					y="5"
					width="17"
					height="15.5"
					rx="2"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
				/>
				<path
					d="M3.5 10h17M8 3.5v3M16 3.5v3"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
				/>
			</svg>
		</button>
		{#if open}
			<div id="dates-pop" class="pop" role="dialog" aria-label="Choose dates" bind:this={pop}>
				<div class="nav">
					<button
						type="button"
						class="shift"
						aria-label="Previous month"
						onclick={() => shiftMonth(-1)}
					>
						<svg viewBox="0 0 20 20" aria-hidden="true">
							<path
								d="M12.5 4.5 7 10l5.5 5.5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
					<p class="heading">{heading}</p>
					<button type="button" class="shift" aria-label="Next month" onclick={() => shiftMonth(1)}>
						<svg viewBox="0 0 20 20" aria-hidden="true">
							<path
								d="M7.5 4.5 13 10l-5.5 5.5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</div>
				<div class="weekdays" aria-hidden="true">
					{#each WEEKDAY_SHORT as name (name)}
						<span>{name}</span>
					{/each}
				</div>
				<div class="grid" role="grid" tabindex="-1" aria-label={heading} onkeydown={onGridKey}>
					{#each weeks as week (week[0]?.iso)}
						<div class="row" role="row">
							{#each week as cell (cell.iso)}
								{@const role = mark(cell.iso)}
								<button
									type="button"
									role="gridcell"
									class="day {role}"
									class:out={!cell.inMonth}
									class:today={cell.iso === today}
									data-iso={cell.iso}
									aria-label={formatDayLong(cell.iso)}
									aria-selected={role === 'start' || role === 'end' || role === 'single'}
									onclick={() => pick(cell.iso)}
									onmouseenter={() => hoverDay(cell.iso)}
									onfocus={() => hoverDay(cell.iso)}
								>
									<span class="num">{cell.day}</span>
								</button>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.block {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.anchor {
		position: relative;
	}

	.field {
		appearance: none;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		margin: 0;
		border: 0;
		border-radius: var(--radius);
		background: var(--input);
		color: var(--ink);
		font: inherit;
		font-size: 1rem;
		font-weight: 450;
		text-align: left;
		padding: 0.85rem 1rem;
		cursor: pointer;
	}

	.icon {
		flex-shrink: 0;
		width: 1.15rem;
		height: 1.15rem;
		color: var(--muted);
	}

	.pop {
		position: absolute;
		z-index: 5;
		top: calc(100% + var(--space-2));
		left: 0;
		right: 0;
		box-sizing: border-box;
		padding: var(--space-3);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--bg);
		box-shadow: 0 10px 28px color-mix(in srgb, var(--ink) 14%, transparent);
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.heading {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 650;
	}

	.shift {
		appearance: none;
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
	}

	.shift svg {
		width: 1.1rem;
		height: 1.1rem;
	}

	.shift:hover {
		background: var(--input);
	}

	.weekdays,
	.row {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
	}

	.weekdays {
		margin-bottom: var(--space-1);
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 650;
		letter-spacing: 0.04em;
		text-align: center;
	}

	.day {
		appearance: none;
		position: relative;
		height: 2.35rem;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.num {
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		margin-inline: auto;
		border-radius: var(--radius-pill);
	}

	.out {
		color: var(--faint);
	}

	.today .num {
		box-shadow: inset 0 0 0 1px var(--line);
	}

	.between {
		background: var(--density-1);
	}

	.start {
		background: linear-gradient(90deg, transparent 50%, var(--density-1) 50%);
	}

	.end {
		background: linear-gradient(90deg, var(--density-1) 50%, transparent 50%);
	}

	.start .num,
	.end .num,
	.single .num {
		background: var(--accent);
		color: var(--accent-ink);
		box-shadow: none;
	}

	.day:hover .num,
	.day:focus-visible .num {
		background: var(--input);
	}

	.start:hover .num,
	.end:hover .num,
	.single:hover .num,
	.start:focus-visible .num,
	.end:focus-visible .num,
	.single:focus-visible .num {
		background: var(--accent);
	}
</style>
