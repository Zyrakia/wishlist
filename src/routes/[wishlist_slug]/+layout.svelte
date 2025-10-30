<script lang="ts">
	import { type Snippet } from 'svelte';
	import { type PageData } from './$types';
	import { page } from '$app/state';

	let { children, data }: { children: Snippet; data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const description = $derived(wishlist.description.trim());
	const badges = $derived(page.data.headerBadges || []);

	const isOwn = $derived(wishlist.userId === data.user?.id);
</script>

<svelte:head>
	<title>{wishlist.name} by {wishlist.user.name}</title>
</svelte:head>

<div class="w-full h-full">
	<div class="p-5 border-b shadow">
		<h1 class="text-2xl font-semibold">{wishlist.name}</h1>
		<p class="font-light text-lg italic">
			by {wishlist.user.name}
			{#if isOwn}
				<span class="not-italic font-bold text-red-400">(You)</span>
			{/if}
		</p>

		{#if description}
			<p class="description text-lg mt-2">"{description}"</p>
		{/if}

		{#if badges.length}
			<div class="flex flex-wrap gap-4 mt-4">
				{#each badges as badge}
					<p class="px-3 py-2 bg-emerald-100 rounded-xl border text-sm">
						{badge}
					</p>
				{/each}
			</div>
		{/if}
	</div>

	<div class="flex-1 relative">
		{@render children()}
	</div>
</div>

<style>
	.description {
		white-space: pre-wrap;
		overflow-wrap: break-word;

		padding: 0.5rem 0.75rem;

		border-left: 2px solid rgba(0, 0, 0, 0.5);
		border-radius: 3px;
	}
</style>
