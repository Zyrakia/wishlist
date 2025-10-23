<script lang="ts">
	import WishlistItemEditor from '$lib/components/wishlist-item-editor.svelte';
	import { showBadge } from '$lib/runes/show-badge.svelte.js';

	const { data } = $props();

	showBadge('Edit Mode');
</script>

<WishlistItemEditor item={data.item} mode="edit" />
