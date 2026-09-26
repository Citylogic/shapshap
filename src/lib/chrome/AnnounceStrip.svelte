<script lang="ts">
	import { resolve } from '$app/paths';
	import { COPY } from '$lib/copy';
</script>

<div class="announce">
	<div class="inner">
		<p class="wordmark">SHAPSHAP</p>
		<a class="new" href={resolve('/')} target="_blank" rel="noopener noreferrer">
			{COPY.newLink}
		</a>
	</div>
</div>

<style>
	.announce {
		flex-shrink: 0;
		background: var(--bg-soft);
		border-bottom: 1px solid var(--line);
	}

	.inner {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		padding: var(--space-2) var(--space-5);
	}

	.wordmark {
		margin: 0;
		color: var(--muted);
		font-family: var(--font-condensed);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.18em;
	}

	.new {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.45rem 0.85rem;
		border-radius: var(--radius);
		background: var(--input);
		color: var(--ink);
		font-size: 0.8rem;
		font-weight: 650;
		text-decoration: none;
	}

	.new:hover {
		background: var(--line);
	}
</style>
