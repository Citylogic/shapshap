<script lang="ts">
	import {
		PRIVACY_BLOCKS,
		PRIVACY_TITLE,
		TERMS_BLOCKS,
		TERMS_TITLE,
		WHY_BLOCKS,
		WHY_LEAD,
		WHY_TITLE
	} from '$lib/copy';
	import LegalCopy from './LegalCopy.svelte';
	import { closeLegal, type LegalDoc } from './legal-modal.svelte';

	type Props = {
		doc: LegalDoc;
	};

	let { doc }: Props = $props();

	let dialog = $state<HTMLDialogElement | undefined>();
	let content = $derived.by(() => {
		if (doc === 'why') {
			return { title: WHY_TITLE, lead: WHY_LEAD, blocks: WHY_BLOCKS, repo: true };
		}
		if (doc === 'terms') {
			return { title: TERMS_TITLE, lead: undefined, blocks: TERMS_BLOCKS, repo: true };
		}
		return { title: PRIVACY_TITLE, lead: undefined, blocks: PRIVACY_BLOCKS, repo: false };
	});

	$effect(() => {
		if (!dialog) return;
		if (!dialog.open) dialog.showModal();
	});

	function requestClose() {
		dialog?.close();
	}

	function onBackdrop(e: MouseEvent) {
		if (e.target !== dialog) return;
		requestClose();
	}
</script>

<dialog bind:this={dialog} aria-labelledby="legal-title" onclose={closeLegal} onclick={onBackdrop}>
	<LegalCopy
		title={content.title}
		lead={content.lead}
		blocks={content.blocks}
		repo={content.repo}
		heading="h2"
		headingId="legal-title"
	/>
	<button type="button" class="close" onclick={requestClose}>Close</button>
</dialog>

<style>
	dialog {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		width: min(28rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 2rem);
		overflow: auto;
		margin: auto;
		border: 0;
		border-radius: var(--radius);
		padding: var(--space-6);
		background: var(--bg);
		color: var(--ink);
		font-family: var(--font-sans);
		box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 0.18);
	}

	dialog::backdrop {
		background: rgb(26 28 27 / 0.4);
	}

	.close {
		appearance: none;
		align-self: flex-start;
		margin: 0;
		border: 0;
		border-radius: var(--radius);
		background: var(--input);
		color: var(--ink);
		font: inherit;
		font-size: 0.95rem;
		font-weight: 650;
		padding: 0.7rem 1rem;
		cursor: pointer;
	}

	.close:hover {
		background: var(--line);
	}
</style>
