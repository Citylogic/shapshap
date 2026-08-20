<script lang="ts">
	type Props = {
		windowStart: string;
		windowEnd: string;
		onWindow: (start: string, end: string) => void;
	};

	let { windowStart, windowEnd, onWindow }: Props = $props();
</script>

<div class="window">
	<input
		type="time"
		value={windowStart}
		aria-label="From"
		oninput={(e) => onWindow(e.currentTarget.value, windowEnd)}
	/>
	<span>to</span>
	<input
		type="time"
		value={windowEnd}
		aria-label="To"
		oninput={(e) => onWindow(windowStart, e.currentTarget.value)}
	/>
</div>

<style>
	.window {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		font-size: 1.25rem;
	}

	input[type='time'] {
		appearance: none;
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		color: inherit;
		font: inherit;
		font-variant-numeric: tabular-nums;
		padding: 0.2rem 0;
		min-width: 6.5rem;
	}

	span {
		color: var(--muted);
	}
</style>
