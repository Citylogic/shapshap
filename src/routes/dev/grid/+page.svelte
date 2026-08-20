<script lang="ts">
	import Grid from '$lib/grid/Grid.svelte';

	let { data } = $props();
</script>

<div class="page">
	<div class="frame">
		<Grid model={data.model} />
	</div>
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		margin: 0;
		padding: 0.75rem 0.75rem 2rem;
		background: #f3efe6;
	}

	.frame {
		overflow: auto;
		max-height: calc(100dvh - 2.75rem);
		border: 1px solid #d9d3c6;
		background: #f3efe6;
	}
</style>
