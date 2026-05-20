<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import NavControls from '$lib/NavControls.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<NavControls />
{@render children()}

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(html) {
		-webkit-text-size-adjust: 100%;
	}

	:global(body) {
		margin: 0;
		background: #f5f5f5;
		color: #333;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	}

	:global(button),
	:global(input),
	:global(select),
	:global(textarea) {
		font: inherit;
	}

	:global(img),
	:global(svg) {
		max-width: 100%;
	}
</style>
