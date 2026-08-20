<script lang="ts">
	import { page } from '$app/state';
	import { COPY } from '$lib/copy';

	let message = $derived(page.status === 404 ? COPY.notFound : 'Something went wrong');
</script>

<div class="page">
	<main>
		<h1>{message}</h1>
	</main>
</div>

<style>
	:global(html, body) {
		margin: 0;
		background: #f3efe6;
	}

	.page {
		--bg: #f3efe6;
		--ink: #1c1a16;
		box-sizing: border-box;
		min-height: 100dvh;
		margin: 0 auto;
		padding: 2rem 1.25rem;
		max-width: 28rem;
		background: var(--bg);
		color: var(--ink);
		font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}
</style>
