<script lang="ts">
	import type { Snippet } from 'svelte';
	import { type PageData } from './$types';

	let { children, data }: { children: Snippet; data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const description = $derived(wishlist.description.trim());
</script>

<svelte:head>
	<title>{wishlist.name} by {wishlist.user.name}</title>
</svelte:head>

<div class="container">
	<div class="header">
		<h1>{wishlist.name}</h1>
		<p>by {wishlist.user.name}</p>

		{#if description}
			<br />
			<p class="description">{description}</p>
		{/if}
	</div>

	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.container {
		width: 100%;
		height: 100%;

		display: flex;
		flex-direction: column;
	}

	.header {
		padding: 1rem;
		border-bottom: 1px solid black;

		box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.5);
	}

	.description {
		white-space: pre-wrap;
		overflow-wrap: break-word;
		font-size: larger;

		padding: 0.5rem 0.75rem;

		border-left: 2px solid rgba(0, 0, 0, 0.5);
		border-radius: 3px;
	}

	.content {
		position: relative;
		width: 100%;
		flex-grow: 1;
	}
</style>
