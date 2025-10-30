<script lang="ts">
	import WishlistItemToolbar from '$lib/components/wishlist-item-toolbar.svelte';
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import { Plus as AddIcon, Share2 as ShareIcon } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { useHasJs } from '$lib/runes/has-js.svelte';

	let { data }: { data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const items = $derived(
		wishlist.items.sort((a, b) => b.createdAt.getSeconds() - a.createdAt.getSeconds()),
	);

	const isOwn = $derived(wishlist.userId === data.user?.id);
	const hasJs = useHasJs();
</script>

<div class="flex gap-3 items-center p-4">
	{#if isOwn}
		<a class="toolbar-button" href="/{wishlist.slug}/item/create">
			<AddIcon size={16} />
			<span>Add Item</span>
		</a>
	{/if}

	<button
		disabled={!hasJs() || !navigator.canShare()}
		onclick={async () => {
			await navigator.share({
				title: `${wishlist.name} by ${wishlist.user.name}`,
				url: location.href,
			});
		}}
		class="toolbar-button"
	>
		<ShareIcon size={16} />
		<span>Share</span>
	</button>
</div>

<main class="w-full px-4 items-wrapper">
	{#if items.length !== 0}
		{#each items as item}
			<WishlistItem {item}>
				{#snippet footer()}
					{#if isOwn}
						<WishlistItemToolbar itemId={item.id} wishlistSlug={wishlist.slug} />
					{/if}
				{/snippet}
			</WishlistItem>
		{/each}
	{:else}
		<p class="italic font-light">
			No items have been added to this list...
			<span class="text-red-500 font-bold">yet.</span>
		</p>
	{/if}
</main>

<style>
	.toolbar-button {
		display: flex;
		gap: 0.5rem;
		align-items: center;

		padding: 0.25rem 0.75rem;
		background-color: white;

		border: 1px solid black;
		border-radius: 8px;
	}

	.items-wrapper {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 550px));
		grid-auto-rows: auto;
		align-content: start;
		gap: 1.5rem 1rem;
	}

	@media (max-width: 600px) {
		.items-wrapper {
			padding: 0.5rem;
		}
	}
</style>
