<script lang="ts">
	import { COPY } from '$lib/copy';

	type Props = {
		href: string;
	};

	let { href }: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(href);
		} catch {
			// Selectable monospace text is still there to hand-copy.
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<h1>Shap.</h1>

<p class="link" data-meeting-link>{href}</p>

<button type="button" class="copy" onclick={copy}>
	{copied ? 'Copied' : 'Copy link'}
</button>

<p class="warn">{COPY.linkWarning}</p>

<style>
	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.link {
		margin: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.95rem;
		line-height: 1.4;
		overflow-wrap: anywhere;
		word-break: break-all;
		user-select: all;
	}

	.copy {
		appearance: none;
		align-self: flex-start;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		padding: 0.35rem 0;
	}

	.warn {
		margin: 0;
		font-size: 1rem;
		line-height: 1.45;
	}
</style>
