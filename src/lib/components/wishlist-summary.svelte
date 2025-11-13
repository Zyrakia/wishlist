<script lang="ts">
	import type { Wishlist } from '$lib/schemas/wishlist';
	import { CircleUserRound, GiftIcon, UserIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let {
		wishlist,
		author,
		footer,
	}: { wishlist: Wishlist; author?: string; footer?: Snippet<[]> } = $props();
</script>

<a
	href="/lists/{wishlist.slug}"
	class="button flex max-w-full min-w-64 flex-1 flex-col justify-center border bg-surface p-3 md:max-w-xs lg:max-w-sm"
>
	<div class="flex flex-1 flex-wrap gap-2" class:items-center={!wishlist.description && !footer}>
		<GiftIcon class="text-danger" />
		<p class="text-lg font-semibold">{wishlist.name}</p>

		{#if author}
			<div class="ms-auto flex items-center gap-2 text-text-muted">
				<CircleUserRound size={16} />
				<p>{author}</p>
			</div>
		{/if}
	</div>

	{#if wishlist.description}
		<p class="mt-1 overflow-hidden font-light text-nowrap text-ellipsis">
			{wishlist.description}
		</p>
	{/if}

	<div class="mt-auto">
		{#if footer}
			{@render footer()}
		{/if}
	</div>
</a>
