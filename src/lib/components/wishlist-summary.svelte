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
	class="button relative flex w-full max-w-full flex-col rounded border bg-surface p-0 shadow"
>
	{#if author}
		<div
			class="flex w-max max-w-1/2 items-center gap-2 rounded-br border-r border-b border-border bg-accent/15 px-4 py-2"
		>
			<CircleUserRound size={18} class="text-accent" />

			<p class="truncate">{author}</p>
		</div>
	{/if}

	<div class="flex h-full flex-col gap-2 p-3">
		<div class="flex flex-1 items-center gap-1.5">
			<GiftIcon class="text-success" size={24} />
			<p class="text-base font-semibold wrap-anywhere">{wishlist.name}</p>
		</div>

		{#if wishlist.description}
			<p class="mt-1 truncate font-light">
				{wishlist.description}
			</p>
		{:else if footer}
			<p class="font-light text-text-muted italic">No description...</p>
		{/if}

		{#if footer}
			<div class="mt-auto">
				{#if footer}
					{@render footer()}
				{/if}
			</div>
		{/if}
	</div>
</a>
