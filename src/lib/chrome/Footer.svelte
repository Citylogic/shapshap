<script lang="ts">
	import { resolve } from '$app/paths';
	import TrustChecks from './TrustChecks.svelte';
</script>

<footer class="band">
	<div class="inner">
		<a class="create" href={resolve('/')}>Create a new shapshap.link</a>
		<TrustChecks variant="band" />
		<nav class="legal" aria-label="Site">
			<a href={resolve('/why')}>How it works</a>
			<span class="dot" aria-hidden="true">·</span>
			<a href={resolve('/terms')}>Terms &amp; Conditions</a>
			<span class="dot" aria-hidden="true">·</span>
			<a href={resolve('/privacy')}>Privacy Policy</a>
		</nav>
		<p class="credit">Made with <span class="heart" aria-hidden="true">♥</span> in Cape Town</p>
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
		margin: 0;
	}

	.heart {
		color: var(--accent);
		font-size: 1.2rem;
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
</style>
