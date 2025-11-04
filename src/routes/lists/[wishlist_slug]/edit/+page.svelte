<script lang="ts">
	import WishlistEditor from '$lib/components/wishlist-editor.svelte';
	import { updateWishlist } from '$lib/remotes/wishlist.remote';
	import { WishlistSchema } from '$lib/schemas/wishlist';

	let { data } = $props();
</script>

<WishlistEditor handler={updateWishlist.preflight(WishlistSchema.partial())} init={data.wishlist} />
