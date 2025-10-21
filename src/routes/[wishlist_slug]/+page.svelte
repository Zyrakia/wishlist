<script lang="ts">
	import WishlistItemToolbar from '$lib/components/wishlist-item-toolbar.svelte';
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
</script>

<div class="items-wrapper">
	{#if wishlist.items.length !== 0}
		{#each wishlist.items as item}
			<WishlistItem {item}>
				{#snippet footer()}
					<WishlistItemToolbar itemId={item.id} wishlistSlug={wishlist.slug} />
				{/snippet}
			</WishlistItem>
		{/each}
	{:else}
		<p class="no-items-message">No items have been added to this list.</p>
	{/if}
</div>

<style>
	.items-wrapper {
		height: 100%;

		padding: 1rem;

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
