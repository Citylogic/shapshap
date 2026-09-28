<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import LegalModal from '$lib/chrome/LegalModal.svelte';
	import { closeLegal, legalModal } from '$lib/chrome/legal-modal.svelte';
	import {
		PRIVACY_BLOCKS,
		PRIVACY_TITLE,
		TERMS_BLOCKS,
		TERMS_TITLE,
		WHY_LEAD,
		WHY_TITLE
	} from '$lib/copy';
	import '../app.css';

	let { children } = $props();
	let origin = $derived(page.url.origin);
	let path = $derived(page.url.pathname);
	let legalSeo = $derived.by(() => {
		if (path === resolve('/why')) {
			return {
				title: `${WHY_TITLE} · shapshap`,
				description: WHY_LEAD,
				url: `${origin}${path}`
			};
		}
		if (path === resolve('/terms')) {
			return {
				title: `${TERMS_TITLE} · shapshap`,
				description: TERMS_BLOCKS[0] ?? '',
				url: `${origin}${path}`
			};
		}
		if (path === resolve('/privacy')) {
			return {
				title: `${PRIVACY_TITLE} · shapshap`,
				description: PRIVACY_BLOCKS[0] ?? '',
				url: `${origin}${path}`
			};
		}
		return null;
	});
	let title = $derived(legalSeo?.title ?? 'shapshap');
	let description = $derived(legalSeo?.description ?? 'pick your times');
	let ogUrl = $derived(legalSeo?.url ?? origin);

	let legalPath: string | undefined;

	$effect(() => {
		const current = path;
		if (legalPath !== undefined && legalPath !== current) closeLegal();
		legalPath = current;
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={ogUrl} />
	<meta property="og:image" content={`${origin}/og.svg`} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if legalSeo}
		<link rel="canonical" href={legalSeo.url} />
	{/if}
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
{#if legalModal.doc}
	<LegalModal doc={legalModal.doc} />
{/if}
