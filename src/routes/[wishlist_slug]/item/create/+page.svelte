<script lang="ts">
	import WishlistItemEditor from '$lib/components/wishlist-item-editor.svelte';
	import { showBadge } from '$lib/runes/show-badge.svelte';

	showBadge('Create Mode');
</script>

<WishlistItemEditor mode="create" />
