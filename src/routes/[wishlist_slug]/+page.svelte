<script lang="ts">
	import WishlistItemToolbar from '$lib/components/wishlist-item-toolbar.svelte';
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import {
		Plus as AddIcon,
		Share2 as ShareIcon,
		ClipboardCheck as CopiedIcon,
		Settings2Icon as EditIcon,
		Trash2Icon,
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { deleteWishlist } from '$lib/remotes/wishlist.remote';

	let { data }: { data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const items = $derived(wishlist.items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
	const isOwn = $derived(wishlist.userId === data.user?.id);

	let shareEnabled = $state(true);
	let copyConfirm = $state(false);
	const tryShare = async () => {
		if (!shareEnabled) return;

		if (navigator.share) {
			const payload: ShareData = {
				url: location.href,
				title: `Check out this wish list: ${wishlist.name}`,
				text: isOwn
					? `This is my wishlist: "${wishlist.name}"`
					: `This is ${wishlist.user.name}'s wishlist: "${wishlist.name}"`,
			};

			if (!navigator.canShare || navigator.canShare(payload)) {
				const res = navigator.share(payload);
				if (res instanceof Promise) return;
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

<div class="flex gap-3 flex-wrap items-stretch justify-between p-4 mt-2">
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

	{#if isOwn}
		<form {...deleteWishlist} class="ms-auto">
			<input {...deleteWishlist.fields.id.as('hidden', data.wishlist.id)} />
			<input {...deleteWishlist.fields.slug.as('hidden', data.wishlist.slug)} />
			<input {...deleteWishlist.fields.confirm.as('hidden', 'no')} />

			<button class="border-0 bg-transparent text-red-600" {...deleteWishlist.buttonProps}>
				<Trash2Icon />
			</button>
		</form>
	{/if}
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
