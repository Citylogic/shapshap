<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import TrustChecks from './TrustChecks.svelte';
	import { openLegal, type LegalDoc } from './legal-modal.svelte';

	type Props = {
		/** Homepage already is the create form, so skip the repeated pitch. */
		home?: boolean;
	};

	let { home = false }: Props = $props();

	function legalPath(doc: LegalDoc) {
		if (doc === 'why') return resolve('/why');
		if (doc === 'terms') return resolve('/terms');
		return resolve('/privacy');
	}

	function onLegal(e: MouseEvent, doc: LegalDoc) {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		if (page.url.pathname === legalPath(doc)) return;
		e.preventDefault();
		openLegal(doc);
	}
</script>

<footer class="band" class:home>
	<div class="inner">
		{#if !home}
			<a class="create" href={resolve('/')}>Create a new shapshap.link</a>
			<TrustChecks variant="band" />
		{/if}
		<nav class="legal" aria-label="Site">
			<a href={resolve('/why')} onclick={(e) => onLegal(e, 'why')}>How it works</a>
			<span class="dot" aria-hidden="true">·</span>
			<a href={resolve('/terms')} onclick={(e) => onLegal(e, 'terms')}>Terms &amp; Conditions</a>
			<span class="dot" aria-hidden="true">·</span>
			<a href={resolve('/privacy')} onclick={(e) => onLegal(e, 'privacy')}>Privacy Policy</a>
		</nav>
		<p class="credit">Made in <span class="marks">🇿🇦</span></p>
	</div>
</footer>

<style>
	.band {
		margin-top: auto;
		background: var(--bg);
		color: var(--muted);
		font-size: 0.8rem;
	}

	.inner {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		width: 100%;
		max-width: 1440px;
		margin: 40px auto;
		padding: var(--space-8) var(--space-5);
		border-top: 1px dashed var(--line);
		text-align: center;
	}

	.legal {
		margin-top: 40px;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: center;
		gap: 0.35rem 0.45rem;
	}

	.legal a {
		color: inherit;
		text-decoration: none;
	}

	.legal a:hover {
		text-decoration: underline;
	}

	.dot {
		color: var(--faint);
	}

	.credit {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		gap: 0.25rem;
	}

	.marks {
		font-size: 1.25rem;
	}

	.create {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: var(--input);
		color: var(--ink);
		font-size: 1.2rem;
		font-weight: 600;
		text-decoration: none;
		margin-bottom: 10px;
	}

	.create:hover {
		background: var(--line);
	}

	.home .inner {
		margin: 0 auto;
		gap: var(--space-3);
		padding: var(--space-6) var(--space-5) var(--space-7);
	}

	.home .legal {
		margin-top: 0;
	}
</style>
