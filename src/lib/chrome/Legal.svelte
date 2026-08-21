<script lang="ts">
	import { REPO } from '$lib/copy';
	import Footer from './Footer.svelte';

	type Props = {
		title: string;
		lead?: string;
		blocks: readonly string[];
		repo?: boolean;
	};

	let { title, lead, blocks, repo = false }: Props = $props();
</script>

<div class="page">
	<main>
		{#if lead}
			<p class="lead">{lead}</p>
		{:else}
			<h1>{title}</h1>
		{/if}
		{#each blocks as block (block)}
			<p>{block}</p>
		{/each}
		{#if repo}
			<p>Run your own: <a href="https://{REPO}">{REPO}</a></p>
		{/if}
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
		max-width: 28rem;
		margin: 0 auto;
		padding: var(--space-6) var(--space-4) var(--space-5);
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	h1,
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
