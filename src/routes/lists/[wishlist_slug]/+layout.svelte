<script lang="ts">
	import { type Snippet } from 'svelte';
	import { type PageData } from './$types';
	import { page } from '$app/state';
	import { CircleArrowLeftIcon } from '@lucide/svelte';

	let { children, data }: { children: Snippet; data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const description = $derived(wishlist.description.trim());
	const badges = $derived(page.data.headerBadges || []);

	const isOwn = $derived(wishlist.userId === data.user?.id);
	const isAtRoot = $derived(page.url.pathname.endsWith(data.wishlist.slug));
</script>

<div class="flex flex-col w-full h-full">
	<div class="p-5 border-b shadow">
		<h1 class="text-2xl font-semibold">{wishlist.name}</h1>
		<p class="font-light text-lg italic">
			by {wishlist.user.name}
			{#if isOwn}
				<span class="not-italic font-bold text-red-400">(You)</span>
			{/if}
		</p>

		{#if badges.length || !isAtRoot}
			<div class="flex flex-wrap gap-4 mt-4 items-center">
				{#if !isAtRoot}
					<a title="Go Back" href="/lists/{data.wishlist.slug}">
						<CircleArrowLeftIcon />
					</a>
				{/if}

				{#each badges as badge}
					<p class="px-3 py-2 bg-emerald-100 rounded-xl border text-sm">
						{badge}
					</p>
				{/each}
			</div>
		{/if}
	</div>

	<div class="h-full w-full">
		{#if description && isAtRoot}
			<div class="p-4 m-4 mb-0 border rounded border-zinc-500/30 shadow-sm">
				<p class="whitespace-pre-wrap wrap-break-word text-base">
					{description}
				</p>
			</div>
		{/if}

		{@render children()}
	</div>
</div>
