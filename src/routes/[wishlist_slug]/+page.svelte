<script lang="ts">
	import WishlistItemToolbar from '$lib/components/wishlist-item-toolbar.svelte';
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import {
		Plus as AddIcon,
		Share2 as ShareIcon,
		ClipboardCheck as CopiedIcon,
		Settings2Icon as EditIcon,
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const items = $derived(
		wishlist.items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
	);
	const isOwn = $derived(wishlist.userId === data.user?.id);

	let shareEnabled = $state(true);
	let copyConfirm = $state(false);
	const tryShare = async () => {
		if (!shareEnabled) return;

		if (navigator.share) {
			const payload: ShareData = {
				url: location.href,
				title: `${wishlist.name} by ${wishlist.user.name}`,
			};

			if (!navigator.canShare || navigator.canShare(payload)) {
				navigator.share(payload);
			}
		}

		if (navigator.clipboard) {
			try {
				shareEnabled = false;
				await navigator.clipboard.writeText(location.href);
				copyConfirm = true;

				setTimeout(() => {
					copyConfirm = false;
					shareEnabled = true;
				}, 2000);
			} catch (err) {}
		}
	};

	onMount(() => (shareEnabled = !!navigator.share || !!navigator.clipboard));
</script>

<div class="flex gap-3 items-center p-4 mt-2">
	{#if isOwn}
		<a class="button bg-green-200" href="/{wishlist.slug}/item/generate">
			<AddIcon size={16} />
			<span>Add Item</span>
		</a>

		<a class="button bg-blue-200" href="/{wishlist.slug}/edit">
			<EditIcon size={16} />
			<span>Edit</span>
		</a>
	{/if}

	<button
		disabled={!shareEnabled}
		onclick={tryShare}
		class="button transition-colors"
		class:cursor-not-allowed={!shareEnabled}
	>
		{#if copyConfirm}
			<CopiedIcon size={16} />
			<span>Link Copied</span>
		{:else}
			<ShareIcon size={16} />
			<span>Share</span>
		{/if}
	</button>
</div>

<main class="w-full flex flex-wrap justify-center gap-4 px-4 pt-2 pb-12">
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
