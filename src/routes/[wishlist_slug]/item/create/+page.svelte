<script lang="ts">
	import WishlistItemEditor from '$lib/components/wishlist-item-editor.svelte';
	import WishlistItemGenerator from '$lib/components/wishlist-item-generator.svelte';
	import { showBadge } from '$lib/runes/show-badge.svelte';

	showBadge('Create Mode');
</script>

<WishlistItemGenerator />
<WishlistItemEditor mode="create" />
