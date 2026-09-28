<script lang="ts">
	import Footer from './Footer.svelte';
	import LegalCopy from './LegalCopy.svelte';

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
		<LegalCopy {title} {lead} {blocks} {repo} />
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
</style>
