<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Days from '$lib/wizard/Days.svelte';
	import Link from '$lib/wizard/Link.svelte';
	import Times from '$lib/wizard/Times.svelte';
	import type { DayRange } from '$lib/wizard/days';
	import {
		DEFAULT_WINDOW_END,
		DEFAULT_WINDOW_START,
		meetingHref,
		postMeeting,
		windowOk
	} from '$lib/wizard/times';

	let step = $state<1 | 2 | 3>(1);
	let range = $state<DayRange | null>(null);
	let windowStart = $state(DEFAULT_WINDOW_START);
	let windowEnd = $state(DEFAULT_WINDOW_END);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let meetingId = $state<string | null>(null);

	let href = $derived(meetingId ? meetingHref(meetingId, window.location.origin) : '');
	let canCreate = $derived(range != null && windowOk(windowStart, windowEnd) && !busy);

	async function getLink() {
		if (!range || !canCreate) return;
		busy = true;
		error = null;
		const result = await postMeeting(range, windowStart, windowEnd);
		busy = false;
		if (!result.ok) {
			error = result.error;
			return;
		}
		meetingId = result.id;
		step = 3;
	}

	function addTimes() {
		if (!meetingId) return;
		void goto(resolve('/m/[id]', { id: meetingId }));
	}
</script>

<div class="page">
	{#if step !== 3}
		<p class="wordmark">shapshap</p>
	{/if}

	<main>
		{#if step === 1}
			<h1>Which days?</h1>
			<Days {range} onRange={(r) => (range = r)} />
			<button type="button" class="go" disabled={!range} onclick={() => (step = 2)}>
				Times →
			</button>
		{:else if step === 2}
			<button type="button" class="back" onclick={() => (step = 1)}>←</button>
			<h1>What times?</h1>
			<Times
				{windowStart}
				{windowEnd}
				onWindow={(start, end) => {
					windowStart = start;
					windowEnd = end;
				}}
			/>
			{#if error}
				<p class="err">{error}</p>
			{/if}
			<button type="button" class="go" disabled={!canCreate} onclick={getLink}>
				Get the link →
			</button>
		{:else}
			<Link {href} />
			<button type="button" class="go" onclick={addTimes}>Add your times →</button>
		{/if}
	</main>

	<footer>
		<p>No accounts. Deleted after.</p>
		<a href={resolve('/why')}>Why →</a>
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

	.err {
		margin: 0;
		font-size: 1rem;
		line-height: 1.45;
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
