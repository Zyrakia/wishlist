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

<div class="flex h-full w-full flex-col">
	<div class="border-b border-border px-5 py-4 shadow">
		<h1 class="text-2xl font-semibold">{wishlist.name}</h1>
		<p class="text-lg font-light italic">
			by {wishlist.user.name}
			{#if isOwn}
				<span class="font-bold text-danger not-italic">(You)</span>
			{/if}
		</p>

		{#if badges.length || !isAtRoot}
			<div class="mt-4 flex flex-wrap items-center gap-4">
				{#if !isAtRoot}
					<a title="Go Back" href="/lists/{data.wishlist.slug}">
						<CircleArrowLeftIcon />
					</a>
				{/if}

				{#each badges as badge}
					<p class="rounded-xl border bg-accent px-3 py-2 text-sm text-accent-fg">
						{badge}
					</p>
				{/each}
			</div>
		{/if}
	</div>

	<div class="h-full w-full">
		{#if description && isAtRoot}
			<div class="m-4 mb-0 rounded-sm border border-accent/50 bg-accent/10 p-4 shadow-sm">
				<p class="text-base wrap-break-word whitespace-pre-wrap">
					{description}
				</p>
			</div>
		{/if}

		{@render children()}
	</div>
</div>
