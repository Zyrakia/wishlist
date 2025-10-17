<script lang="ts">
	import type { WishlistItem as _WishlistItemType } from '$lib/server/db/schema';
	import WishlistItem from './wishlist-item.svelte';

	type ItemType = Omit<_WishlistItemType, 'id' | 'wishlistId' | 'createdAt'>;

	let { item: initItem = {} }: { item?: Partial<ItemType> } = $props();

	let itemProperties = $state<Partial<ItemType>>({ ...initItem });

	const DEFAULT_ITEM: ItemType = {
		name: 'New Item',
		notes: 'New Item Description',
		imageUrl: 'https://placehold.co/600x400?text=New+Item',
		url: 'https://example.com',
		price: 0.01,
		priceCurrency: 'USD',
	};

	const displayedItem = $derived({ ...DEFAULT_ITEM, ...itemProperties, createdAt: new Date() });
</script>

<div class="container">
	<WishlistItem item={displayedItem} interactive={false} />

	<form></form>
</div>

<style>
	.container {
		width: 100%;
		height: 100%;

		padding: 1rem;

		display: flex;
		flex-wrap: wrap;
		align-items: center;
	}
</style>
