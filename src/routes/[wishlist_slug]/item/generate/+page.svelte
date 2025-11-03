<script lang="ts">
	import WishlistItemEditor from '$lib/components/wishlist-item-editor.svelte';
	import { createItem } from '$lib/remotes/item.remote';
	import { ItemSchema } from '$lib/schemas/item';
</script>

<WishlistItemEditor generate={true} handler={createItem.preflight(ItemSchema)} />
