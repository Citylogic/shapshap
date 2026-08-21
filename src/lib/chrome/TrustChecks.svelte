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
		align-items: flex-start;
		gap: var(--space-2);
	}

	.checks li::before {
		content: '✓';
		flex-shrink: 0;
		font-weight: 650;
	}

	.setup {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.band {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-5);
	}
</style>
