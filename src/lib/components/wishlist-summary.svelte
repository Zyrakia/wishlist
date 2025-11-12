<script lang="ts">
	import type { Wishlist } from '$lib/schemas/wishlist';
	import { GiftIcon, UserIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let {
		wishlist,
		author,
		footer,
	}: { wishlist: Wishlist; author?: string; footer?: Snippet<[]> } = $props();
</script>

<a
	href="/lists/{wishlist.slug}"
	class="button flex max-w-full min-w-xs flex-1 flex-col justify-center border bg-surface p-3 md:max-w-xs lg:max-w-sm"
>
	<div class="flex flex-1 flex-wrap gap-2">
		<GiftIcon class="text-danger" />
		<p class="text-lg font-semibold">{wishlist.name}</p>

		{#if author}
			<div class="font-base ms-auto flex gap-1 text-text-muted">
				<UserIcon size={16} />
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
