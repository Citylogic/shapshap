<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { restoreVisit, writeClaim } from '$lib/claim';
	import { COPY } from '$lib/copy';
	import Footer from '$lib/chrome/Footer.svelte';
	import EntryModal from '$lib/meeting/EntryModal.svelte';
	import { needsEntry } from '$lib/meeting/entry';
	import { parseLiveMessage } from '$lib/meeting/live';
	import {
		PAGE_SIZE,
		clampPageStart,
		formatMeetingMeta,
		formatOrgLabel,
		jumpEnd,
		respondentCountLabel,
		respondentMark,
		shiftPage,
		todayPageStart,
		truncateLink,
		visibleRangeLabel
	} from '$lib/meeting/chrome';
	import FlatGrid from '$lib/grid/FlatGrid.svelte';
	import { todayIso } from '$lib/grid/flat';
	import { relabelGridModel } from '$lib/grid/model';
	import {
		densityLevels,
		displayName,
		formatPeekWhen,
		mergeLive,
		peekLists,
		scoreOverlap,
		type OverlapPerson
	} from '$lib/grid/overlap';
	import { showZoneControl, viewerTz, wallAt, zoneIds } from '$lib/grid/zone';
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
	let entered = $state(false);
	let picked = $state<string | null>(null);
	let pageStart = $state(0);
	let paged = $state(false);
	let inflight = false;
	let queued = false;
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let shapTimer: ReturnType<typeof setTimeout> | undefined;

	let placeholder = $derived(
		data.status === 'ok' ? `Guest ${data.responses.length + 1}` : 'Guest 1'
	);
	let parsedName = $derived(parseName(name));
	let liveName = $derived(parsedName.ok ? parsedName.name : null);
	let remotePeople = $state<OverlapPerson[] | null>(null);
	let livePeople = $derived(
		data.status === 'ok' && participantId
			? mergeLive(remotePeople ?? data.responses, {
					participant_id: participantId,
					name: liveName,
					slots: [...selected]
				})
			: []
	);
	let detectedTz = $state<string | null>(null);
	let viewTz = $state('');
	let zones = $derived(browser ? zoneIds() : []);
	let displayTz = $derived(data.status === 'ok' ? viewTz || data.meeting.tz : '');
	let model = $derived.by(() => {
		if (data.status !== 'ok') return null;
		if (displayTz === data.meeting.tz) return data.model;
		return relabelGridModel(data.model, displayTz);
	});
	let zoneOpen = $derived(data.status === 'ok' && showZoneControl(detectedTz, data.meeting.tz));
	let overlap = $derived(
		data.status === 'ok' && model ? scoreOverlap(livePeople, model.cells.length) : null
	);
	let density = $derived(overlap ? densityLevels(overlap.counts, overlap.total) : []);
	let people = $derived(livePeople.length);
	let href = $derived(browser ? window.location.href : '');
	let linkLabel = $derived(href ? truncateLink(href) : '');
	let today = $derived(displayTz ? todayIso(displayTz) : '');
	let kicker = $derived(
		data.status === 'ok'
			? formatOrgLabel(data.meeting.organisation, data.meeting.meeting_label)
			: ''
	);
	let meta = $derived(
		data.status === 'ok'
			? formatMeetingMeta(
					data.meeting.slot_minutes,
					data.meeting.starts_on,
					data.meeting.ends_on
				)
			: ''
	);
	let dayDates = $derived(model ? model.days.map((d) => d.date) : []);
	let dayCount = $derived(dayDates.length);
	let windowStart = $derived(clampPageStart(pageStart, dayCount));
	let canPage = $derived(dayCount > PAGE_SIZE);
	let windowLabel = $derived(visibleRangeLabel(dayDates, windowStart));

	let peekIndex = $state<number | null>(null);
	let peek = $derived.by(() => {
		if (data.status !== 'ok' || peekIndex == null || !overlap || !model) return null;
		const cell = model.cells[peekIndex];
		if (!cell?.exists) return null;
		const ms = model.instants[peekIndex];
		const day = model.days[cell.dayIndex];
		const time = model.times[cell.slotInDay];
		const wall =
			ms != null ? wallAt(ms, displayTz) : day && time ? { date: day.date, time: time.time } : null;
		if (!wall) return null;
		const lists = peekLists(livePeople, peekIndex);
		return {
			when: formatPeekWhen(wall.date, wall.time),
			best: overlap.best.has(peekIndex),
			freeCount: overlap.counts[peekIndex] ?? 0,
			total: overlap.total,
			...lists
		};
	});

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let showEntry = $derived(
		booted && data.status === 'ok' && !entered && needsEntry(!ephemeral, name)
	);

	$effect(() => {
		if (booted || !browser || data.status !== 'ok') return;
		booted = true;
		const restored = restoreVisit(data.meeting.id, data.responses, localStorage, newId);
		participantId = restored.participantId;
		name = restored.name;
		selected = new Set(restored.slots);
		ephemeral = restored.ephemeral;
		const tz = viewerTz();
		detectedTz = tz;
		viewTz = tz;
	});

	$effect(() => {
		if (paged || !model || !today) return;
		paged = true;
		pageStart = todayPageStart(dayDates, today);
	});

	$effect(() => {
		if (!browser || data.status !== 'ok') return;
		const snapshot = data.responses;
		const es = new EventSource(`/api/m/${data.meeting.id}/live`);
		remotePeople = snapshot;
		es.onmessage = (ev) => {
			const next = parseLiveMessage(ev.data);
			if (next) remotePeople = next;
		};
		return () => es.close();
	});

	function onEntry(display: string) {
		name = display;
		ephemeral = false;
		entered = true;
		if (browser && data.status === 'ok') writeClaim(data.meeting.id, participantId, localStorage);
		queueMicrotask(() => document.querySelector<HTMLElement>('.frame')?.focus());
	}

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

	function togglePerson(id: string) {
		picked = picked === id ? null : id;
	}

	function goPage(next: number) {
		pageStart = clampPageStart(next, dayCount);
	}
</script>

<div class="page">
	{#if data.status === 'ok'}
		{#if showEntry}
			<EntryModal onContinue={onEntry} />
		{/if}
		<div class="work" inert={showEntry ? true : undefined}>
			<header>
				<div class="intro">
					<p class="kicker">{kicker}</p>
					<h1>When are you free?</h1>
					<p class="meta">{meta}</p>
					{#if zoneOpen}
						<label class="tz">
							<select aria-label="Time zone" bind:value={viewTz}>
								{#each zones as z (z)}
									<option value={z}>{z.replaceAll('_', ' ')}</option>
								{/each}
							</select>
						</label>
					{/if}
					<input
						class="name"
						type="text"
						maxlength={NAME_MAX}
						{placeholder}
						autocomplete="off"
						spellcheck="false"
						aria-label="Your name"
						bind:value={name}
						oninput={scheduleSave}
					/>
					{#if shap}
						<p class="shap">Shap</p>
					{/if}
					{#if error}
						<p class="err">{error}</p>
					{/if}
					<div class="people">
						<p class="count">{respondentCountLabel(people)}</p>
						<ul class="marks">
							{#each livePeople as person, i (person.participant_id)}
								<li>
									<button
										type="button"
										class="mark"
										class:mine={person.participant_id === participantId}
										class:open={picked === person.participant_id}
										aria-expanded={picked === person.participant_id}
										aria-label={displayName(person.name, i)}
										onclick={() => togglePerson(person.participant_id)}
									>
										{respondentMark(person.name, i)}
									</button>
									{#if picked === person.participant_id}
										<div class="who">
											<p>{displayName(person.name, i)}</p>
											{#if person.participant_id !== participantId}
												<button type="button" class="take" onclick={() => void takeOver(person)}>
													This is me
												</button>
											{/if}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				</div>
				<div class="tools">
					<div class="share">
						<p class="url" title={href}>{linkLabel}</p>
						<button type="button" class="copy" onclick={copyLink}>
							{copied ? 'Copied' : 'Copy link'}
						</button>
					</div>
					<div class="pager" role="group" aria-label="Days">
						<button
							type="button"
							class="nav"
							aria-label="First days"
							disabled={!canPage || windowStart === 0}
							onclick={() => goPage(0)}
						>
							«
						</button>
						<button
							type="button"
							class="nav"
							aria-label="Previous days"
							disabled={!canPage || windowStart === 0}
							onclick={() => goPage(shiftPage(windowStart, -1, dayCount))}
						>
							‹
						</button>
						<p class="window">{windowLabel}</p>
						<button
							type="button"
							class="nav"
							aria-label="Next days"
							disabled={!canPage || windowStart >= jumpEnd(dayCount)}
							onclick={() => goPage(shiftPage(windowStart, 1, dayCount))}
						>
							›
						</button>
						<button
							type="button"
							class="nav"
							aria-label="Last days"
							disabled={!canPage || windowStart >= jumpEnd(dayCount)}
							onclick={() => goPage(jumpEnd(dayCount))}
						>
							»
						</button>
					</div>
				</div>
			</header>
			<div class="frame" tabindex="-1">
				{#if model}
					<FlatGrid
						{model}
						slots={[...selected]}
						{density}
						best={overlap?.best ?? new Set()}
						slotMinutes={data.meeting.slot_minutes}
						{today}
						pageStart={windowStart}
						pageSize={PAGE_SIZE}
						onChange={(next) => {
							selected = next;
							scheduleSave();
						}}
						onPeek={(index) => (peekIndex = index)}
					/>
				{/if}
			</div>
			{#if peek}
				<aside class="peek">
					<p class="when">{peek.when}{#if peek.best} · Best{/if}</p>
					<p class="of">{peek.freeCount} of {peek.total} free</p>
					{#if peek.free.length}
						<p><span class="k">Free</span> {peek.free.join(', ')}</p>
					{/if}
					{#if peek.notFree.length}
						<p><span class="k">Not free</span> {peek.notFree.join(', ')}</p>
					{/if}
				</aside>
			{/if}
		</div>
	{:else if data.status === 'gone'}
		<main>
			<h1>{COPY.goneTitle}</h1>
			<p>{COPY.goneKeep}</p>
			<p>{COPY.goneArchive}</p>
			<a href={resolve('/')}>{COPY.goneCta}</a>
		</main>
	{:else}
		<main>
			<h1>{data.message}</h1>
		</main>
	{/if}
	<Footer />
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		background: var(--bg-soft);
		color: var(--ink);
		font-family: var(--font-sans);
	}

	.work {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: var(--space-5) var(--space-5) 0;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-5);
		margin-bottom: var(--space-4);
	}

	.intro {
		min-width: 0;
		flex: 1 1 16rem;
	}

	.kicker {
		margin: 0;
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.16em;
	}

	h1 {
		margin: 0.35rem 0 0;
		font-size: clamp(1.6rem, 4vw, 2.15rem);
		font-weight: 750;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}

	.meta,
	.count {
		margin: var(--space-2) 0 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.08em;
	}

	.name {
		appearance: none;
		display: block;
		width: min(14rem, 100%);
		margin-top: var(--space-3);
		border: 0;
		border-bottom: 1px solid var(--line);
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.95rem;
		font-weight: 600;
		padding: 0.2rem 0;
	}

	.people {
		margin-top: var(--space-4);
	}

	.marks {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.45rem;
		margin: var(--space-2) 0 0;
		padding: 0;
		list-style: none;
	}

	.marks li {
		position: relative;
	}

	.mark,
	.nav,
	.copy {
		appearance: none;
		border: 0;
		cursor: pointer;
		font: inherit;
	}

	.mark {
		display: grid;
		place-items: center;
		width: 2.35rem;
		height: 2.35rem;
		padding: 0;
		border-radius: 50%;
		background: var(--input);
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.mark.mine,
	.mark.open {
		background: var(--line);
		color: var(--ink);
	}

	.who {
		position: absolute;
		z-index: 2;
		top: calc(100% + 0.35rem);
		left: 0;
		min-width: 8rem;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		background: var(--bg);
		box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 0.12);
		font-size: 0.8rem;
	}

	.who p {
		margin: 0;
	}

	.take {
		appearance: none;
		margin-top: 0.3rem;
		border: 0;
		padding: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 650;
		cursor: pointer;
	}

	.tools {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-3);
		flex: 0 1 auto;
	}

	.share {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		max-width: 100%;
		padding: 0.35rem 0.35rem 0.35rem 0.85rem;
		border-radius: var(--radius);
		background: var(--bg);
	}

	.url {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--muted);
		font-size: 0.8rem;
		max-width: 12rem;
	}

	.copy {
		flex-shrink: 0;
		padding: 0.45rem 0.7rem;
		border-radius: calc(var(--radius) - 0.15rem);
		background: var(--input);
		color: inherit;
		font-size: 0.8rem;
		font-weight: 650;
	}

	.pager {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.nav {
		display: grid;
		place-items: center;
		width: 2.15rem;
		height: 2.15rem;
		border-radius: 0.55rem;
		background: var(--bg);
		color: var(--ink);
		font-size: 1rem;
		line-height: 1;
	}

	.nav:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.window {
		margin: 0;
		padding: 0.45rem 0.7rem;
		border-radius: 0.55rem;
		background: var(--bg);
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 650;
		white-space: nowrap;
	}

	.tz {
		display: block;
		margin: var(--space-2) 0 0;
	}

	.tz select {
		appearance: none;
		max-width: 100%;
		margin: 0;
		border: 0;
		border-bottom: 1px solid var(--line);
		border-radius: 0;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-size: 0.8rem;
		padding: 0.15rem 0;
	}

	.shap,
	.err {
		margin: var(--space-2) 0 0;
		font-size: 0.9rem;
	}

	.shap {
		font-weight: 650;
		animation: shap-fade 1.4s ease forwards;
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

	.frame {
		overflow: auto;
		max-height: calc(100dvh - 8rem);
		background: var(--bg-soft);
	}

	main {
		max-width: 28rem;
		margin: 2rem auto;
		padding: 0 1.25rem;
	}

	main h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	main p {
		margin: 0.85rem 0 0;
		font-size: 1rem;
		line-height: 1.45;
	}

	main a {
		display: inline-block;
		margin-top: 1.5rem;
		color: inherit;
		font-size: 1.05rem;
		font-weight: 600;
		text-decoration: none;
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
