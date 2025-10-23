<script lang="ts">
	import WishlistItemToolbar from '$lib/components/wishlist-item-toolbar.svelte';
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import { BadgePlus as AddIcon } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const items = $derived(
		wishlist.items.sort((a, b) => b.createdAt.getSeconds() - a.createdAt.getSeconds()),
	);
</script>

<div class="toolbar">
	<a href="/{wishlist.slug}/item/create" class="button create-button">
		<AddIcon />
		<span>Add Item</span>
	</a>
</div>

<main class="items-wrapper">
	{#if items.length !== 0}
		{#each items as item}
			<WishlistItem {item}>
				{#snippet footer()}
					<WishlistItemToolbar itemId={item.id} wishlistSlug={wishlist.slug} />
				{/snippet}
			</WishlistItem>
		{/each}
	{:else}
		<p class="no-items-message">No items have been added to this list.</p>
	{/if}
</main>

<style>
	.toolbar {
		display: flex;
		align-items: center;

		padding: 1.5rem 2rem;
	}

	.button {
		padding: 0.75rem 1.5rem;
		font-size: large;
	}

	.create-button {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.items-wrapper {
		height: 100%;

		padding: 0 2rem;

		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 600px));
		grid-auto-rows: auto;
		align-content: start;
		gap: 1.5rem 1rem;

		background-color: #fafafa;
	}

	@media (max-width: 600px) {
		.items-wrapper {
			padding: 0.5rem;
		}
	}

	.no-items-message {
		align-self: center;
		justify-self: center;
	}
</style>
