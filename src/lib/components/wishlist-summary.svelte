<script lang="ts">
	import type { Wishlist } from '$lib/schemas/wishlist';
	import { GiftIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let { wishlist, footer }: { wishlist: Wishlist; footer?: Snippet<[]> } = $props();
</script>

<a
	href="/lists/{wishlist.slug}"
	class="button flex max-w-full min-w-xs flex-1 flex-col justify-center border bg-surface p-3 md:max-w-xs lg:max-w-sm"
>
	<div class="flex flex-1 items-center gap-2">
		<GiftIcon class="text-danger" />
		<p class="text-lg font-semibold">{wishlist.name}</p>
	</div>

	{#if wishlist.description}
		<p class="mt-1 font-light wrap-break-word whitespace-pre-wrap">{wishlist.description}</p>
	{/if}

	<div class="mt-auto">
		{#if footer}
			{@render footer()}
		{/if}
	</div>
</a>
