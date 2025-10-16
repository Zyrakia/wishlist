<script lang="ts">
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
		<div class="items-wrapper">
			{#if wishlist.items.length !== 0}
				{#each wishlist.items as item}
					<WishlistItem {item} />
				{/each}
			{:else}
				<p class="no-items-message">No items have been added to this list.</p>
			{/if}
		</div>
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
	}

	.description {
		white-space: pre-wrap;
		font-size: larger;

		padding: 0.5rem 0.75rem;

		border-left: 2px solid rgba(0, 0, 0, 0.5);
		border-radius: 3px;
	}

	.content {
		height: 100%;
		padding: 1rem;

		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.items-wrapper {
		height: 100%;

		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		grid-auto-rows: auto;
		align-content: start;
		gap: 1rem;
	}

	.no-items-message {
		align-self: center;
		justify-self: center;
	}
</style>
