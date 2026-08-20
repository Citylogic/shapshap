<script lang="ts">
	import Days from '$lib/wizard/Days.svelte';
	import type { DayRange } from '$lib/wizard/days';

	let step = $state<1 | 2>(1);
	let range = $state<DayRange | null>(null);
</script>

<div class="page">
	<p class="wordmark">shapshap</p>

	<main>
		{#if step === 1}
			<h1>Which days?</h1>
			<Days {range} onRange={(r) => (range = r)} />
			<button type="button" class="go" disabled={!range} onclick={() => (step = 2)}>
				Times →
			</button>
		{:else}
			<button type="button" class="back" onclick={() => (step = 1)}>←</button>
			<h1>What times?</h1>
			<button type="button" class="go" disabled>Get the link →</button>
		{/if}
	</main>

	<footer>
		<p>No accounts. Deleted after.</p>
		<!-- /why content is S16; a 404 here is the placeholder. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href="/why">Why →</a>
	</footer>
</div>

<style>
	:global(html, body) {
		margin: 0;
		background: #f3efe6;
	}

	.page {
		--bg: #f3efe6;
		--ink: #1c1a16;
		--muted: #8a8578;
		--line: #d9d3c6;
		--cell: #fffcf5;
		--self: #2c6b4a;
		--self-soft: #c9e2d3;
		box-sizing: border-box;
		min-height: 100dvh;
		margin: 0 auto;
		padding: 1.25rem 1.25rem 1.5rem;
		max-width: 28rem;
		display: flex;
		flex-direction: column;
		background: var(--bg);
		color: var(--ink);
		font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}

	.wordmark {
		margin: 0 0 2rem;
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.go,
	.back {
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 0;
	}

	.go {
		align-self: flex-start;
		margin-top: auto;
		padding: 0.85rem 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.go:disabled {
		color: var(--muted);
		cursor: not-allowed;
	}

	.back {
		align-self: flex-start;
		padding: 0.2rem 0;
		color: var(--muted);
	}

	footer {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		margin-top: 2rem;
		color: var(--muted);
		font-size: 0.8rem;
	}

	footer p {
		margin: 0;
	}

	footer a {
		color: inherit;
		text-decoration: none;
	}
</style>
