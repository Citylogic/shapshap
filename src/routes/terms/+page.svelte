<script lang="ts">
	import Legal from '$lib/chrome/Legal.svelte';
	import { TERMS_BLOCKS, TERMS_TITLE } from '$lib/copy';
</script>

<Legal title={TERMS_TITLE} blocks={TERMS_BLOCKS} repo />
