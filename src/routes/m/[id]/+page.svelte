<script lang="ts">
	import { browser } from '$app/environment';
	import { restoreVisit, writeClaim } from '$lib/claim';
	import { COPY } from '$lib/copy';
	import Grid from '$lib/grid/Grid.svelte';
	import {
		densityLevels,
		displayName,
		formatPeekWhen,
		mergeLive,
		peekLists,
		scoreOverlap,
		type OverlapPerson
	} from '$lib/grid/overlap';
	import { newId } from '$lib/ids';
	import { NAME_MAX, parseName } from '$lib/name';

	let { data } = $props();

	const SAVE_MS = 400;
	const SHAP_MS = 1400;
	const RETRY_MS = 3000;

	let name = $state('');
	let selected = $state<ReadonlySet<number>>(new Set());
	let error = $state<string | null>(null);
	let shap = $state(false);
	let participantId = $state('');
	let ephemeral = $state(true);
	let booted = $state(false);
	let listOpen = $state(false);
	let picked = $state<string | null>(null);
	let inflight = false;
	let queued = false;
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let shapTimer: ReturnType<typeof setTimeout> | undefined;

	let placeholder = $derived(
		data.status === 'ok' ? `Guest ${data.responses.length + 1}` : 'Guest 1'
	);
	let parsedName = $derived(parseName(name));
	let liveName = $derived(parsedName.ok ? parsedName.name : null);
	let livePeople = $derived(
		data.status === 'ok' && participantId
			? mergeLive(data.responses, {
					participant_id: participantId,
					name: liveName,
					slots: [...selected]
				})
			: []
	);
	let overlap = $derived(
		data.status === 'ok' ? scoreOverlap(livePeople, data.model.cells.length) : null
	);
	let density = $derived(overlap ? densityLevels(overlap.counts, overlap.total) : []);
	let people = $derived(livePeople.length);
	let href = $derived(browser ? window.location.href : '');

	let peekIndex = $state<number | null>(null);
	let peek = $derived.by(() => {
		if (data.status !== 'ok' || peekIndex == null || !overlap) return null;
		const cell = data.model.cells[peekIndex];
		if (!cell?.exists) return null;
		const day = data.model.days[cell.dayIndex];
		const time = data.model.times[cell.slotInDay];
		if (!day || !time) return null;
		const lists = peekLists(livePeople, peekIndex);
		return {
			when: formatPeekWhen(day.date, time.time),
			freeCount: overlap.counts[peekIndex] ?? 0,
			total: overlap.total,
			...lists
		};
	});

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (booted || !browser || data.status !== 'ok') return;
		booted = true;
		const restored = restoreVisit(data.meeting.id, data.responses, localStorage, newId);
		participantId = restored.participantId;
		name = restored.name;
		selected = new Set(restored.slots);
		ephemeral = restored.ephemeral;
	});

	function scheduleSave() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => void flushSave(), SAVE_MS);
	}

	async function flushSave() {
		if (!browser || !participantId || data.status !== 'ok') return;
		if (inflight) {
			queued = true;
			return;
		}

		const parsed = parseName(name);
		if (!parsed.ok) {
			error = parsed.reason === 'contact' ? COPY.contact : null;
			return;
		}

		inflight = true;
		try {
			const res = await fetch(`/api/m/${data.meeting.id}/r/${participantId}`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: parsed.name,
					slots: [...selected].sort((a, b) => a - b)
				})
			});
			if (res.ok) {
				error = null;
				writeClaim(data.meeting.id, participantId, localStorage);
				shap = true;
				clearTimeout(shapTimer);
				shapTimer = setTimeout(() => (shap = false), SHAP_MS);
			} else if (res.status === 400 || res.status === 429) {
				const body: unknown = await res.json().catch(() => null);
				error =
					body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
						? body.error
						: COPY.offline;
			} else {
				error = COPY.offline;
			}
		} catch {
			error = COPY.offline;
		} finally {
			inflight = false;
			if (queued) {
				queued = false;
				void flushSave();
			}
		}
	}

	$effect(() => {
		if (error !== COPY.offline) return;
		const handle = setInterval(() => void flushSave(), RETRY_MS);
		return () => clearInterval(handle);
	});

	async function copyLink() {
		if (!href) return;
		try {
			await navigator.clipboard.writeText(href);
		} catch {
			// The address bar still has the full URL.
		}
		copied = true;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 2000);
	}

	async function takeOver(person: OverlapPerson) {
		if (!browser || data.status !== 'ok') return;
		const prev = participantId;
		if (ephemeral && prev && prev !== person.participant_id) {
			try {
				await fetch(`/api/m/${data.meeting.id}/r/${prev}`, { method: 'DELETE' });
			} catch {
				// Claim still switches; a leftover Guest row is retried on the next visit.
			}
		}
		participantId = person.participant_id;
		name = person.name ?? '';
		selected = new Set(person.slots);
		ephemeral = false;
		picked = null;
		writeClaim(data.meeting.id, person.participant_id, localStorage);
	}
</script>

<div class="page">
	{#if data.status === 'ok'}
		<header>
			<input
				class="name"
				type="text"
				maxlength={NAME_MAX}
				{placeholder}
				autocomplete="off"
				spellcheck="false"
				bind:value={name}
				oninput={scheduleSave}
			/>
			<button
				type="button"
				class="people"
				aria-expanded={listOpen}
				onclick={() => (listOpen = !listOpen)}
			>
				{people} people
			</button>
			<button type="button" class="copy" onclick={copyLink}>
				{copied ? 'Copied' : 'Copy link'}
			</button>
			{#if shap}
				<p class="shap">Shap</p>
			{/if}
			{#if error}
				<p class="err">{error}</p>
			{/if}
			{#if listOpen}
				<ul class="names">
					{#each livePeople as person, i (person.participant_id)}
						<li>
							<button
								type="button"
								class="who"
								onclick={() =>
									(picked = picked === person.participant_id ? null : person.participant_id)}
							>
								{displayName(person.name, i)}
							</button>
							{#if picked === person.participant_id && person.participant_id !== participantId}
								<button type="button" class="take" onclick={() => void takeOver(person)}>
									This is me
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</header>
		<div class="frame">
			<Grid
				model={data.model}
				selection={selected}
				{density}
				best={overlap?.best}
				onChange={(next) => {
					selected = next;
					scheduleSave();
				}}
				onPeek={(index) => (peekIndex = index)}
			/>
		</div>
		{#if peek}
			<aside class="peek">
				<p class="when">{peek.when}</p>
				<p class="of">{peek.freeCount} of {peek.total} free</p>
				<p><span class="k">Free</span> {peek.free.join(', ')}</p>
				<p><span class="k">Not free</span> {peek.notFree.join(', ')}</p>
			</aside>
		{/if}
	{:else if data.status === 'gone'}
		<main>
			<h1>This one's gone.</h1>
		</main>
	{:else}
		<main>
			<h1>{data.message}</h1>
		</main>
	{/if}
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
		box-sizing: border-box;
		min-height: 100dvh;
		margin: 0;
		padding: 0.75rem 0.75rem 1.5rem;
		background: var(--bg);
		color: var(--ink);
		font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem 1rem;
		margin-bottom: 0.75rem;
	}

	.name {
		appearance: none;
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 1rem;
		font-weight: 600;
		padding: 0.2rem 0;
		min-width: 8rem;
		max-width: 12rem;
	}

	.people,
	.shap,
	.err {
		margin: 0;
		font-size: 0.9rem;
	}

	.people {
		appearance: none;
		border: 0;
		padding: 0;
		background: transparent;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
	}

	.names {
		flex-basis: 100%;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.names li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem 0.6rem;
	}

	.who,
	.take {
		appearance: none;
		border: 0;
		padding: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.take {
		font-weight: 650;
	}

	.peek {
		display: grid;
		grid-template-columns: 4.5rem 1fr;
		column-gap: 0.75rem;
		row-gap: 0.15rem;
		margin-top: 0.75rem;
		font-size: 0.85rem;
		line-height: 1.35;
	}

	.when,
	.of {
		grid-column: 1 / -1;
		margin: 0;
	}

	.when {
		font-weight: 650;
	}

	.of {
		color: var(--muted);
		margin-bottom: 0.25rem;
	}

	.peek p {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
		margin: 0;
	}

	.k {
		color: var(--muted);
	}

	.copy {
		appearance: none;
		margin-left: auto;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		padding: 0.2rem 0;
	}

	.shap {
		font-weight: 650;
		animation: shap-fade 1.4s ease forwards;
	}

	.err {
		flex-basis: 100%;
	}

	.frame {
		overflow: auto;
		max-height: calc(100dvh - 4.5rem);
		border: 1px solid var(--line);
		background: var(--bg);
	}

	main {
		max-width: 28rem;
		margin: 2rem auto;
		padding: 0 1.25rem;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	@keyframes shap-fade {
		0% {
			opacity: 1;
		}
		60% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
