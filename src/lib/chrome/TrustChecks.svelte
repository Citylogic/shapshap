<script lang="ts">
	type Props = {
		/** Setup page uses the longer three lines; meeting footer uses the short band. */
		variant?: 'setup' | 'band';
	};

	let { variant = 'band' }: Props = $props();

	const setup = [
		'No account needed — not for you, not for them',
		'Anyone with the link can add their times',
		'Everything is deleted 24 hours after the end date'
	] as const;

	const band = [
		'No account needed',
		'No email required',
		'No data kept longer than needed'
	] as const;

	let items = $derived(variant === 'setup' ? setup : band);
</script>

<ul class="checks" class:band={variant === 'band'} class:setup={variant === 'setup'}>
	{#each items as line (line)}
		<li>{line}</li>
	{/each}
</ul>

<style>
	.checks {
		margin: 0;
		padding: 0;
		list-style: none;
		color: var(--ink);
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.checks li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.checks li::before {
		content: '✓';
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-ink);
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1;
	}

	.setup {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.band {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-2) var(--space-5);
	}
</style>
