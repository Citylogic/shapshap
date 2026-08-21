<script lang="ts">
	import Legal from '$lib/chrome/Legal.svelte';
	import { PRIVACY_BLOCKS, PRIVACY_TITLE } from '$lib/copy';
</script>

<Legal title={PRIVACY_TITLE} blocks={PRIVACY_BLOCKS} />
