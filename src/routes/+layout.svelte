<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let origin = $derived(page.url.origin);
</script>

<svelte:head>
	<title>shapshap</title>
	<meta name="description" content="pick your times" />
	<meta property="og:title" content="shapshap" />
	<meta property="og:description" content="pick your times" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={origin} />
	<meta property="og:image" content={`${origin}/og.svg`} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="shapshap" />
	<meta name="twitter:description" content="pick your times" />
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
