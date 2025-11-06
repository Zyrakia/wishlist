<script lang="ts">
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import { deleteItem } from '$lib/remotes/item.remote.js';

	const { data } = $props();
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-8 p-4 lg:flex-row">
	<WishlistItem interactive={false} item={data.item} />

	<form {...deleteItem}>
		<input {...deleteItem.fields.wishlistSlug.as('hidden', data.wishlist.slug)} />
		<input {...deleteItem.fields.itemId.as('hidden', data.item.id)} />
		<input {...deleteItem.fields.confirm.as('hidden', 'true')} />

		<p class="mb-4 text-center">
			Are you sure you want to delete <span class="font-bold">{data.item.name}</span>
		</p>

		<div class="flex justify-center gap-4">
			<button tabindex="0" class="bg-red-300" {...deleteItem.buttonProps}>Delete</button>
			<a class="button" href="/lists/{data.wishlist.slug}">Cancel</a>
		</div>
	</form>
</div>
