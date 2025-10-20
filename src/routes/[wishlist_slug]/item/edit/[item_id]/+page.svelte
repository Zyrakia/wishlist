<script lang="ts">
	import WishlistItemEditor from '$lib/components/wishlist-item-editor.svelte';

	const { data } = $props();
</script>

<WishlistItemEditor item={data.item} />
