<script lang="ts">
	import type { Wishlist } from '$lib/schemas/wishlist';
	import { CircleUserRound, GiftIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let {
		wishlist,
		author,
		footer,
	}: { wishlist: Wishlist; author?: string; footer?: Snippet<[]> } = $props();

	const hasBody = $derived(!!wishlist.description || !!footer);
</script>

<a
	href="/lists/{wishlist.slug}"
	class="button flex w-full max-w-full flex-col justify-center border bg-surface p-3"
>
	<div class="flex flex-col justify-center gap-1">
		{#if author}
			<div class="flex items-center gap-2 text-sm text-text-muted">
				<CircleUserRound size={22} class="text-accent" />
				<p class="truncate italic">
					From <span class="not-italic underline text-text">{author}</span>
				</p>
			</div>
		{/if}

		<div class="flex items-center gap-1.5">
			<GiftIcon class="text-success" size={24} />
			<p class="text-base font-semibold wrap-anywhere">{wishlist.name}</p>
		</div>
	</div>

	{#if hasBody}
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
	{/if}
</a>
