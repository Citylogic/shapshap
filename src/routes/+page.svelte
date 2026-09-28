<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Footer from '$lib/chrome/Footer.svelte';
	import TrustChecks from '$lib/chrome/TrustChecks.svelte';
	import DateRangeField from '$lib/wizard/DateRangeField.svelte';
	import {
		LABEL_MAX,
		daySpan,
		defaultRange,
		formReady,
		postMeeting,
		rangeError,
		rangeIncludesWeekend,
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
	let showWeekends = $derived(range != null && rangeIncludesWeekend(range.start, range.end));
	let canCreate = $derived(formReady(meetingLabel, range) && !busy);

	async function generate(e: SubmitEvent) {
		e.preventDefault();
		if (!range || !canCreate) return;
		busy = true;
		error = null;
		const result = await postMeeting(meetingLabel, range, showWeekends && weekends);
		busy = false;
		if (!result.ok) {
			error = result.error;
			return;
		}
		void goto(resolve('/m/[id]', { id: result.id }));
	}
</script>

<div class="page">
	<div class="pitch">
		<div class="stack">
			<div class="lead">
				<p class="wordmark">SHAPSHAP</p>
				<h1>Find a time that works</h1>
				<p class="sub">
					Generate a shareable link where everyone marks when they're free to meet. No accounts, no
					back-and-forth.
				</p>
			</div>
			<TrustChecks variant="setup" />
		</div>
		<Footer home />
	</div>

	<main>
		<h2>Create your link</h2>
		<form onsubmit={generate}>
			<label>
				Label
				<input
					type="text"
					name="meeting_label"
					maxlength={LABEL_MAX}
					placeholder="Q4 planning sync (30 min)"
					autocomplete="off"
					bind:value={meetingLabel}
				/>
			</label>
			<DateRangeField bind:start={startsOn} bind:end={endsOn} />
			{#if showWeekends}
				<div class="weekends">
					<p class="wk-label">
						<span id="weekends-label">Include weekends</span><button
							type="button"
							class="q"
							aria-describedby="weekends-hint">?</button
						>
						<span id="weekends-hint" class="tip" role="tooltip"
							>Saturdays and Sundays appear as columns.</span
						>
					</p>
					<button
						type="button"
						class="toggle"
						role="switch"
						aria-checked={weekends}
						aria-labelledby="weekends-label"
						onclick={() => (weekends = !weekends)}
					>
						<span class="knob"></span>
					</button>
				</div>
			{/if}
			{#if spanError}
				<p class="err">{spanError}</p>
			{:else if error}
				<p class="err">{error}</p>
			{/if}
			<button type="submit" class="go" disabled={!canCreate}>Generate shareable link →</button>
		</form>
	</main>
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		background: #f8f8f8;
		color: var(--ink);
		font-family: var(--font-sans);
	}

	.pitch,
	.stack,
	.lead {
		display: contents;
	}

	.wordmark,
	h1,
	.sub,
	main,
	.stack :global(.checks) {
		box-sizing: border-box;
		width: calc(100% - 2 * var(--space-5));
		max-width: 26rem;
		margin-inline: auto;
	}

	.wordmark {
		margin: 0 auto;
		padding-top: var(--space-7);
		text-align: center;
		font-size: 0.7rem;
		font-weight: 650;
		letter-spacing: 0.16em;
	}

	h1 {
		margin: 0 auto;
		text-align: center;
		font-size: 1.85rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.15;
	}

	.sub {
		margin: 0 auto;
		text-align: center;
		color: var(--ink);
		font-size: 0.95rem;
		line-height: 1.45;
	}

	main {
		order: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-5);
		border-radius: 1.25rem;
		background: var(--bg);
		box-shadow: 0 12px 32px color-mix(in srgb, var(--ink) 18%, transparent);
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.stack :global(.checks) {
		order: 2;
		padding-bottom: var(--space-2);
	}

	.stack :global(.checks li::before) {
		background: var(--bg);
		color: var(--accent);
	}

	.pitch :global(footer) {
		order: 3;
		background: transparent;
		color: var(--ink);
	}

	.pitch :global(footer .inner) {
		border-top-color: color-mix(in srgb, var(--ink) 28%, transparent);
	}

	.pitch :global(footer .dot) {
		color: color-mix(in srgb, var(--ink) 45%, transparent);
	}

	.page :global(:focus-visible) {
		outline-color: var(--ink);
	}

	.page main :global(:focus-visible) {
		outline-color: var(--accent);
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

	input[type='text'] {
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

	.weekends {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		container-type: inline-size;
	}

	.wk-label {
		position: relative;
		flex-direction: row;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		font-size: 1rem;
		font-weight: 450;
	}

	.q {
		appearance: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-sizing: border-box;
		width: 1.15rem;
		height: 1.15rem;
		margin: 0;
		padding: 0;
		border: 1px solid currentColor;
		border-radius: var(--radius-pill);
		background: none;
		color: inherit;
		font: inherit;
		font-size: 0.72rem;
		font-weight: 650;
		line-height: 1;
		cursor: help;
	}

	.tip {
		position: absolute;
		z-index: 1;
		top: 50%;
		left: calc(100% + var(--space-2));
		box-sizing: border-box;
		width: max-content;
		max-width: min(14rem, calc(100cqi - 100% - 3.75rem));
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		background: var(--ink);
		color: var(--bg);
		font-size: 0.75rem;
		font-weight: 450;
		line-height: 1.35;
		text-wrap: balance;
		transform: translateY(-50%);
		opacity: 0;
		pointer-events: none;
	}

	.q:hover + .tip,
	.q:focus-visible + .tip {
		opacity: 1;
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
