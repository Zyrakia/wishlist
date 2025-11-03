<script lang="ts">
	import WishlistItemEditor from '$lib/components/wishlist-item-editor.svelte';
	import { updateItem } from '$lib/remotes/item.remote.js';
	import { ItemSchema } from '$lib/schemas/item.js';

	const { data } = $props();
</script>

<WishlistItemEditor init={data.item} generate={false} handler={updateItem.preflight(ItemSchema.partial())} />
