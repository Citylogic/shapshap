<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Footer from '$lib/chrome/Footer.svelte';
	import TrustChecks from '$lib/chrome/TrustChecks.svelte';
	import {
		LABEL_MAX,
		daySpan,
		defaultRange,
		formReady,
		postMeeting,
		rangeError,
		type DayRange
	} from '$lib/wizard/times';

	const initial = defaultRange();

	let meetingLabel = $state('');
	let startsOn = $state(initial.start);
	let endsOn = $state(initial.end);
	let weekends = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);

	let range = $derived.by((): DayRange | null => {
		if (!startsOn || !endsOn) return null;
		if (daySpan(startsOn, endsOn) == null) return null;
		return { start: startsOn, end: endsOn };
	});
	let spanError = $derived(range ? rangeError(range) : null);
	let canCreate = $derived(formReady(meetingLabel, range) && !busy);

	async function generate(e: SubmitEvent) {
		e.preventDefault();
		if (!range || !canCreate) return;
		busy = true;
		error = null;
		const result = await postMeeting(meetingLabel, range, weekends);
		busy = false;
		if (!result.ok) {
			error = result.error;
			return;
		}
		void goto(resolve('/m/[id]', { id: result.id }));
	}
</script>

<div class="page">
	<main>
		<p class="wordmark">SHAPSHAP</p>
		<h1>Find a time that works</h1>
		<p class="sub">
			Generate a shareable link where everyone marks when they're free to meet. No accounts, no
			back-and-forth.
		</p>

		<form onsubmit={generate}>
			<label>
				Meeting label
				<input
					type="text"
					name="meeting_label"
					maxlength={LABEL_MAX}
					placeholder="Q4 planning sync (30 min)"
					autocomplete="off"
					bind:value={meetingLabel}
				/>
			</label>
			<div class="dates">
				<label>
					Start date
					<input type="date" name="starts_on" bind:value={startsOn} />
				</label>
				<label>
					End date
					<input type="date" name="ends_on" bind:value={endsOn} />
				</label>
			</div>
			<div class="weekends">
				<div>
					<p class="wk-label" id="weekends-label">Include weekends</p>
					<p class="hint" id="weekends-hint">Saturday and Sunday appear as columns.</p>
				</div>
				<button
					type="button"
					class="toggle"
					role="switch"
					aria-checked={weekends}
					aria-labelledby="weekends-label"
					aria-describedby="weekends-hint"
					onclick={() => (weekends = !weekends)}
				>
					<span class="knob"></span>
				</button>
			</div>
			{#if spanError}
				<p class="err">{spanError}</p>
			{:else if error}
				<p class="err">{error}</p>
			{/if}
			<button type="submit" class="go" disabled={!canCreate}>Generate shareable link →</button>
		</form>

		<TrustChecks variant="setup" />
	</main>

	<Footer />
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		margin: 0;
		display: flex;
		flex-direction: column;
		background: var(--bg);
		color: var(--ink);
		font-family: var(--font-sans);
	}

	main {
		box-sizing: border-box;
		flex: 1;
		width: 100%;
		max-width: 26rem;
		margin: 0 auto;
		padding: var(--space-7) var(--space-5) var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.wordmark {
		margin: 0;
		text-align: center;
		font-size: 0.7rem;
		font-weight: 650;
		letter-spacing: 0.16em;
	}

	h1 {
		margin: 0;
		text-align: center;
		font-size: 1.85rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.15;
	}

	.sub {
		margin: 0;
		text-align: center;
		color: var(--muted);
		font-size: 0.95rem;
		line-height: 1.45;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	label,
	.wk-label {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 600;
	}

	input[type='text'],
	input[type='date'] {
		appearance: none;
		box-sizing: border-box;
		width: 100%;
		margin: 0;
		border: 0;
		border-radius: var(--radius);
		background: var(--input);
		color: var(--ink);
		font: inherit;
		font-size: 1rem;
		font-weight: 450;
		padding: 0.85rem 1rem;
	}

	.dates {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.weekends {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.wk-label,
	.hint {
		margin: 0;
	}

	.hint {
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 400;
		line-height: 1.35;
	}

	.toggle {
		appearance: none;
		flex-shrink: 0;
		box-sizing: border-box;
		width: 2.75rem;
		height: 1.6rem;
		margin: 0;
		padding: 0.15rem;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--line);
		cursor: pointer;
	}

	.toggle[aria-checked='true'] {
		background: var(--accent);
	}

	.knob {
		display: block;
		width: 1.3rem;
		height: 1.3rem;
		border-radius: var(--radius-pill);
		background: var(--bg);
		transform: translateX(0);
	}

	.toggle[aria-checked='true'] .knob {
		transform: translateX(1.15rem);
	}

	.go {
		appearance: none;
		width: 100%;
		margin: var(--space-2) 0 0;
		border: 0;
		border-radius: var(--radius);
		background: var(--accent);
		color: var(--accent-ink);
		font: inherit;
		font-size: 1.05rem;
		font-weight: 650;
		padding: 0.95rem 1.25rem;
		cursor: pointer;
	}

	.go:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.err {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.45;
	}
</style>
