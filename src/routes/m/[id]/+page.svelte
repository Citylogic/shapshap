<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { restoreVisit, writeClaim } from '$lib/claim';
	import { COPY } from '$lib/copy';
	import AnnounceStrip from '$lib/chrome/AnnounceStrip.svelte';
	import Footer from '$lib/chrome/Footer.svelte';
	import EntryModal from '$lib/meeting/EntryModal.svelte';
	import { needsEntry } from '$lib/meeting/entry';
	import { parseLiveMessage } from '$lib/meeting/live';
	import {
		PAGE_SIZE,
		availableCountLabel,
		clampPageStart,
		formatMeetingLabel,
		formatMeetingMeta,
		jumpEnd,
		respondentCountLabel,
		respondentMark,
		shiftPage,
		todayPageStart,
		truncateLink,
		visibleRangeLabel
	} from '$lib/meeting/chrome';
	import FlatGrid from '$lib/grid/FlatGrid.svelte';
	import { deviceTz, todayIso } from '$lib/civil';
	import { relabelGridModel } from '$lib/grid/model';
	import {
		densityLevels,
		displayName,
		freeIdsAt,
		mergeLive,
		scoreOverlap,
		type OverlapPerson
	} from '$lib/grid/overlap';
	import { showZoneControl, zoneIds } from '$lib/grid/zone';
	import { newId } from '$lib/ids';
	import { parseName } from '$lib/name';

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
	let showRename = $state(false);
	let pageStart = $state(0);
	let paged = $state(false);
	let inflight = false;
	let queued = false;
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let shapTimer: ReturnType<typeof setTimeout> | undefined;

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
	let kicker = $derived(data.status === 'ok' ? formatMeetingLabel(data.meeting.meeting_label) : '');
	let meta = $derived(
		data.status === 'ok'
			? formatMeetingMeta(data.meeting.slot_minutes, data.meeting.starts_on, data.meeting.ends_on)
			: ''
	);
	let dayDates = $derived(model ? model.days.map((d) => d.date) : []);
	let dayCount = $derived(dayDates.length);
	let windowStart = $derived(clampPageStart(pageStart, dayCount));
	let canPage = $derived(dayCount > PAGE_SIZE);
	let windowLabel = $derived(visibleRangeLabel(dayDates, windowStart));

	let peekIndex = $state<number | null>(null);
	let peekLevel = $derived.by(() => {
		if (peekIndex == null || !overlap || !model) return 0;
		const cell = model.cells[peekIndex];
		if (!cell?.exists) return 0;
		if ((overlap.counts[peekIndex] ?? 0) <= 0) return 0;
		return density[peekIndex] ?? 0;
	});
	let peekFree = $derived(
		peekLevel > 0 && peekIndex != null ? freeIdsAt(livePeople, peekIndex) : null
	);
	let peopleLabel = $derived(
		peekFree != null ? availableCountLabel(peekFree.size, people) : respondentCountLabel(people)
	);

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
		entered = !needsEntry(!restored.ephemeral, restored.name);
		const tz = deviceTz();
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
		scheduleSave();
		queueMicrotask(() => document.querySelector<HTMLElement>('.frame')?.focus());
	}

	function onRename(display: string) {
		name = display;
		showRename = false;
		scheduleSave();
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
		entered = !needsEntry(true, person.name ?? '');
		picked = null;
		writeClaim(data.meeting.id, person.participant_id, localStorage);
	}

	function togglePerson(id: string) {
		if (id === participantId) {
			picked = null;
			showRename = true;
			return;
		}
		picked = picked === id ? null : id;
	}

	function closePeople(e: { target: unknown }) {
		if (picked == null) return;
		const t = e.target;
		if (t instanceof Element && t.closest('.people')) return;
		picked = null;
	}

	function goPage(next: number) {
		pageStart = clampPageStart(next, dayCount);
	}
</script>

<svelte:window
	onclick={closePeople}
	onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		picked = null;
		if (showRename) showRename = false;
	}}
/>

<div class="page">
	{#if data.status === 'ok'}
		{#if showEntry}
			<EntryModal onContinue={onEntry} />
		{:else if showRename}
			<EntryModal
				mode="rename"
				initialName={name}
				onContinue={onRename}
				onDismiss={() => (showRename = false)}
			/>
		{/if}
		<AnnounceStrip />
		<div class="work" inert={showEntry ? true : undefined}>
			<header>
				<div class="top">
					<div class="intro">
						<h1>When are you free?</h1>
						<p class="kicker">{kicker}</p>
						<p class="meta">{meta}</p>
						{#if shap}
							<p class="shap">Shap</p>
						{/if}
						{#if error}
							<p class="err">{error}</p>
						{/if}
					</div>
					<div class="share">
						<p class="url" title={href}>{linkLabel}</p>
						<button type="button" class="copy" onclick={copyLink}>
							{copied ? 'Copied' : 'Copy link'}
						</button>
					</div>
				</div>
				<div class="strip">
					<div class="people">
						<p class="count">{peopleLabel}</p>
						<ul class="marks">
							{#each livePeople as person, i (person.participant_id)}
								{@const lit = peekFree?.has(person.participant_id) ?? false}
								{@const dim = peekFree != null && !lit}
								<li>
									<button
										type="button"
										class="mark"
										class:mine={person.participant_id === participantId}
										class:open={picked === person.participant_id}
										class:lit
										class:dim
										class:d1={lit && peekLevel === 1}
										class:d2={lit && peekLevel === 2}
										class:d3={lit && peekLevel === 3}
										class:d4={lit && peekLevel === 4}
										aria-expanded={picked === person.participant_id}
										aria-haspopup={person.participant_id === participantId ? 'dialog' : 'true'}
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
					<div class="tools">
						<div class="pager" role="group" aria-label="Days">
							<div class="moves">
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
							<p class="window">{windowLabel}</p>
						</div>
						{#if zoneOpen}
							<label class="tz">
								<select aria-label="Time zone" bind:value={viewTz}>
									{#each zones as z (z)}
										<option value={z}>{z.replaceAll('_', ' ')}</option>
									{/each}
								</select>
							</label>
						{/if}
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
		background: var(--bg);
		color: var(--ink);
		font-family: var(--font-sans);
	}

	.work {
		box-sizing: border-box;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		padding: var(--space-5) var(--space-5) 0;
	}

	header {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-5);
	}

	.intro {
		min-width: 0;
		flex: 1 1 16rem;
	}

	.strip {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	h1 {
		margin: 0;
		font-size: clamp(1.6rem, 4vw, 2.25rem);
		font-weight: 750;
		letter-spacing: -0.03em;
		line-height: 1.1;
		color: var(--accent);
		letter-spacing: 0.03em;
		font-family: var(--font-condensed);
		text-transform: uppercase;
	}

	.kicker {
		margin: 0.35rem 0 0;
		color: var(--muted);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.16em;
	}

	.meta {
		margin: var(--space-2) 0 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.08em;
	}

	.count {
		margin: 0;
		flex-shrink: 0;
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 650;
		letter-spacing: 0.08em;
		white-space: nowrap;
	}

	.people {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
		flex: 1 1 12rem;
	}

	.marks {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.marks li {
		position: relative;
		flex-shrink: 0;
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

	.mark.mine {
		border-radius: 5px;
	}

	.mark.lit.d1 {
		background: var(--density-1);
		color: var(--ink);
	}

	.mark.lit.d2 {
		background: var(--density-2);
		color: var(--ink);
	}

	.mark.lit.d3 {
		background: var(--density-3);
		color: var(--ink);
	}

	.mark.lit.d4 {
		background: var(--density-4);
		color: var(--accent-ink);
	}

	.mark.dim {
		opacity: 0.15;
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
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		flex: 0 1 auto;
	}

	.share {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		max-width: 100%;
		margin-left: auto;
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
		gap: var(--space-3);
	}

	.moves {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		padding: 0.2rem;
		border-radius: var(--radius);
		background: var(--input);
	}

	.nav {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: calc(var(--radius) - 0.2rem);
		background: transparent;
		color: var(--ink);
		font-size: 1rem;
		line-height: 1;
	}

	.nav:not(:disabled):hover {
		background: var(--bg);
	}

	.nav:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.window {
		margin: 0;
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 650;
		white-space: nowrap;
	}

	.tz {
		display: block;
		max-width: 100%;
	}

	.tz select {
		appearance: none;
		max-width: 14rem;
		margin: 0;
		border: 0;
		border-radius: 0.55rem;
		background: var(--bg);
		color: var(--muted);
		font: inherit;
		font-size: 0.75rem;
		padding: 0.45rem 0.7rem;
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

	.frame {
		flex: 1;
		min-height: 0;
		overflow: auto;
		background: var(--bg);
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
