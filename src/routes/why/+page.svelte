<script lang="ts">
	import Legal from '$lib/chrome/Legal.svelte';
	import { WHY_BLOCKS, WHY_LEAD, WHY_TITLE } from '$lib/copy';
</script>

<Legal title={WHY_TITLE} lead={WHY_LEAD} blocks={WHY_BLOCKS} repo />
