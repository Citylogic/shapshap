<script lang="ts">
	import { COPY } from '$lib/copy';
	import { NAME_MAX, parseName } from '$lib/name';

	type Props = {
		onContinue: (name: string) => void;
	};

	let { onContinue }: Props = $props();

	let dialog = $state<HTMLDialogElement | undefined>();
	let first = $state('');
	let last = $state('');
	let err = $state<string | null>(null);

	let parsed = $derived(parseName(`${first} ${last}`));
	let canGo = $derived(first.trim() !== '' && last.trim() !== '' && parsed.ok);

	$effect(() => {
		if (!dialog) return;
		if (!dialog.open) dialog.showModal();
	});

	function submit(e: { preventDefault(): void }) {
		e.preventDefault();
		if (!parsed.ok) {
			err = parsed.reason === 'contact' ? COPY.contact : null;
			return;
		}
		err = null;
		onContinue(parsed.name);
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="entry-title"
	aria-describedby="entry-body"
	oncancel={(e) => e.preventDefault()}
>
	<form onsubmit={submit}>
		<h2 id="entry-title">When are you free?</h2>
		<p id="entry-body">
			Paint the times you can do. Anyone with this link can see and change answers.
		</p>
		<label>
			First name
			<input
				type="text"
				name="first"
				maxlength={NAME_MAX}
				autocomplete="given-name"
				bind:value={first}
			/>
		</label>
		<label>
			Last name
			<input
				type="text"
				name="last"
				maxlength={NAME_MAX}
				autocomplete="family-name"
				bind:value={last}
			/>
		</label>
		{#if err}
			<p class="err">{err}</p>
		{/if}
		<button type="submit" class="go" disabled={!canGo}>Continue →</button>
	</form>
</dialog>

<style>
	dialog {
		box-sizing: border-box;
		width: min(24rem, calc(100vw - 2rem));
		margin: auto;
		border: 0;
		border-radius: var(--radius);
		padding: var(--space-6);
		background: var(--bg);
		color: var(--ink);
		font-family: var(--font-sans);
		box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 0.18);
	}

	dialog::backdrop {
		background: rgb(26 28 27 / 0.4);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	h2 {
		margin: 0;
		font-size: 1.45rem;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	p {
		margin: 0;
		color: var(--muted);
		font-size: 0.95rem;
		line-height: 1.45;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 600;
	}

	input {
		appearance: none;
		box-sizing: border-box;
		width: 100%;
		margin: 0;
		border: 0;
		border-radius: var(--radius);
		background: var(--input);
		color: var(--ink);
		font: inherit;
		font-size: 1rem;
		font-weight: 400;
		padding: 0.85rem 1rem;
	}

	.err {
		color: var(--ink);
	}

	.go {
		appearance: none;
		width: 100%;
		margin-top: var(--space-2);
		border: 0;
		border-radius: var(--radius);
		background: var(--accent);
		color: var(--accent-ink);
		font: inherit;
		font-size: 1.05rem;
		font-weight: 650;
		padding: 0.95rem 1.25rem;
		cursor: pointer;
	}

	.go:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
