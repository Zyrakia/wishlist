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
		<a class="button" href="/{wishlist.slug}/item/generate">
			<AddIcon size={16} />
			<span>Add Item</span>
		</a>
	{/if}

	<button
		disabled={!hasJs() || !navigator.canShare?.()}
		onclick={async () => {
			await navigator.share({
				title: `${wishlist.name} by ${wishlist.user.name}`,
				url: location.href,
			});
		}}
		class="button"
	>
		<ShareIcon size={16} />
		<span>Share</span>
	</button>
</div>

<main class="w-full flex flex-wrap gap-4 p-4">
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
	.button {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
</style>
