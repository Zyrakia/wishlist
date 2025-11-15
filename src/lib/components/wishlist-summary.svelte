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
	class="button flex w-full max-w-full flex-col justify-center border bg-surface p-3"
>
	<div class="flex w-full gap-6" class:items-center={!wishlist.description && !footer}>
		<div class="flex flex-1 items-center gap-2">
			<GiftIcon class="shrink-0 text-danger" size={20} />

			<p class="text-base font-bold wrap-anywhere">{wishlist.name}</p>
		</div>

		{#if author}
			<div class="ms-auto flex shrink-0 items-center gap-2 text-sm font-semibold text-accent">
				<CircleUserRound size={18} />
				<p>{author}</p>
			</div>
		{/if}
	</div>

	{#if wishlist.description}
		<p class="mt-1 truncate font-light">
			{wishlist.description}
		</p>
	{/if}

	<div class="mt-auto">
		{#if footer}
			{@render footer()}
		{/if}
	</div>
</a>
