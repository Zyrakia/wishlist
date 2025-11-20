<script lang="ts">
	import WishlistEditor from '$lib/components/wishlist-editor.svelte';
	import { createWishlist } from '$lib/remotes/wishlist.remote';
	import { WishlistSchema } from '$lib/schemas/wishlist';

	const remote = createWishlist.preflight(WishlistSchema);
</script>

<div class="flex h-full items-center justify-center">
	<div class="h-max w-full flex justify-center">
		<WishlistEditor handler={remote} />
	</div>
</div>
