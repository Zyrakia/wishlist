<script>
	import { deleteWishlist } from '$lib/remotes/wishlist.remote.js';

	let { data } = $props();
</script>

<form {...deleteWishlist} class="w-full h-full flex flex-col items-center justify-center">
	<input {...deleteWishlist.fields.id.as('hidden', data.wishlist.id)} />
	<input {...deleteWishlist.fields.slug.as('hidden', data.wishlist.slug)} />
	<input {...deleteWishlist.fields.confirm.as('hidden', 'true')} />

	<p class="text-center mb-4">
		Are you sure you want to delete <span class="font-bold">{data.wishlist.name}</span>
	</p>

	<div class="flex justify-center gap-4">
		<button tabindex="0" class="bg-red-300" {...deleteWishlist.buttonProps}>Delete</button>
		<a class="button" href="/lists/{data.wishlist.slug}">Cancel</a>
	</div>
</form>
