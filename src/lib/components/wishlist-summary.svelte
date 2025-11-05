<script lang="ts">
	import type { Wishlist } from '$lib/schemas/wishlist';
	import { GiftIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let { wishlist, footer }: { wishlist: Wishlist; footer?: Snippet<[]> } = $props();
</script>

<a
	href="/lists/{wishlist.slug}"
	class="button flex flex-col justify-center p-3 border max-w-full flex-1 min-w-xs md:max-w-xs lg:max-w-sm bg-white"
>
	<div class="flex-1 flex gap-2 items-center">
		<GiftIcon class="text-red-400" />
		<p class="font-bold text-lg">{wishlist.name}</p>
	</div>

	{#if wishlist.description}
		<p class="font-light whitespace-pre-wrap wrap-break-word mt-1">{wishlist.description}</p>
	{/if}

	<div class="mt-auto">
		{#if footer}
			{@render footer()}
		{/if}
	</div>
</a>
