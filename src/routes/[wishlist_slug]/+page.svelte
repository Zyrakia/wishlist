<script lang="ts">
	import WishlistItemToolbar from '$lib/components/wishlist-item-toolbar.svelte';
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const items = $derived(
		wishlist.items.sort((a, b) => b.createdAt.getSeconds() - a.createdAt.getSeconds()),
	);
</script>

<div class="items-wrapper">
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
</div>

<style>
	.items-wrapper {
		height: 100%;

		padding: 2rem;

		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
