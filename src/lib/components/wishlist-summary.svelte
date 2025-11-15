<script lang="ts">
	import type { Wishlist } from '$lib/schemas/wishlist';
	import { CircleUserRound, GiftIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let {
		wishlist,
		author,
		footer,
	}: { wishlist: Wishlist; author?: string; footer?: Snippet<[]> } = $props();
</script>

<a
	href="/lists/{wishlist.slug}"
	class="button flex w-full max-w-full flex-1 flex-col justify-center border bg-surface p-3 sm:max-w-2xs md:max-w-sm lg:max-w-md"
>
	<div class="flex flex-1 gap-8" class:items-center={!wishlist.description && !footer}>
		<div class="flex items-center gap-2">
			<GiftIcon class="text-danger" />

			<p class="text-base font-bold">{wishlist.name}</p>
		</div>

		{#if author}
			<div class="ms-auto flex items-center gap-2 text-sm font-semibold text-accent">
				<CircleUserRound size={18} />
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
