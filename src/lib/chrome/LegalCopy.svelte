<script lang="ts">
	import { REPO } from '$lib/copy';

	type Props = {
		title: string;
		lead?: string;
		blocks: readonly string[];
		repo?: boolean;
		heading?: 'h1' | 'h2';
		headingId?: string;
	};

	let { title, lead, blocks, repo = false, heading = 'h1', headingId }: Props = $props();
</script>

<div class="copy">
	{#if lead}
		<p class="lead" id={headingId}>{lead}</p>
	{:else}
		<svelte:element this={heading} id={headingId}>{title}</svelte:element>
	{/if}
	{#each blocks as block (block)}
		<p>{block}</p>
	{/each}
	{#if repo}
		<p>Run your own: <a href="https://{REPO}">{REPO}</a></p>
	{/if}
</div>

<style>
	.copy {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	h1,
	h2,
	.lead {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 650;
		letter-spacing: -0.02em;
		line-height: 1.2;
	}

	p {
		margin: 0;
		font-size: 1rem;
		line-height: 1.45;
	}

	a {
		color: inherit;
	}
</style>
