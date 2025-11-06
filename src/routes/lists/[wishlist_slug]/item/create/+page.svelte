<script lang="ts">
	import WishlistItemEditor from '$lib/components/wishlist-item-editor.svelte';
	import { createItem } from '$lib/remotes/item.remote';
	import { ItemSchema } from '$lib/schemas/item';

	let { data } = $props();
</script>

<WishlistItemEditor
	init={data.initItem}
	generate={false}
	handler={createItem.preflight(ItemSchema)}
/>
