<script lang="ts">
	import { resolve } from '$app/paths';
	import TrustChecks from './TrustChecks.svelte';
</script>

<footer class="band">
	<TrustChecks variant="band" />
	<nav class="legal" aria-label="Site">
		<a href={resolve('/why')}>How it works</a>
		<span class="dot" aria-hidden="true">·</span>
		<a href={resolve('/terms')}>Terms &amp; Conditions</a>
		<span class="dot" aria-hidden="true">·</span>
		<a href={resolve('/privacy')}>Privacy Policy</a>
	</nav>
	<div class="bottom">
		<p class="credit">Made with ♥ in Cape Town</p>
		<a class="create" href={resolve('/')}>Create a new shapshap.link</a>
	</div>
</footer>

<style>
	.band {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: auto;
		padding: var(--space-5) var(--space-4);
		background: var(--bg-footer);
		color: var(--muted);
		font-size: 0.8rem;
	}

	.legal {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
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

	.bottom {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.credit {
		margin: 0;
	}

	.create {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: var(--input);
		color: var(--ink);
		font-weight: 600;
		text-decoration: none;
	}

	.create:hover {
		background: var(--line);
	}
</style>
