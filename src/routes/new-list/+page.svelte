<script lang="ts">
	import WishlistEditor from '$lib/components/wishlist-editor.svelte';
	import { createWishlist } from '$lib/remotes/wishlist.remote';
	import { WishlistSchema } from '$lib/schemas/wishlist';

	const remote = createWishlist.preflight(WishlistSchema);
</script>

<WishlistEditor handler={remote} />
