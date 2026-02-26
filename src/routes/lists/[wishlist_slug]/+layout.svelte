<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { type PageData } from './$types';
	import { page } from '$app/state';
	import { CircleArrowLeftIcon, DotIcon, LinkIcon } from '@lucide/svelte';
	import WishlistConnection from '$lib/components/wishlist-connection.svelte';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { formatRelative } from '$lib/util/date';
	import { invalidateAll } from '$app/navigation';
	import { checkSyncStatus } from '$lib/remotes/connection.remote';
	import { clock } from '$lib/runes/clock.svelte';
	import { UrlBuilder } from '$lib/util/url';

	let { children, data }: { children: Snippet; data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const connections = $derived(wishlist.connections);
	const description = $derived(wishlist.description.trim());
	const badges = $derived(page.data.listHeaderBadge ?? []);

	const isOwn = $derived(wishlist.userId === data.user?.id);
	const hasJs = useHasJs();

	const updateSyncStatus = async () => {
		const ids = data.syncingConnectionIds;

		const syncStatuses = await checkSyncStatus({ connectionIds: ids });
		if (syncStatuses.length) {
			await invalidateAll();

			if (
				syncStatuses.every((v) => !v.syncError) &&
				syncStatuses.length === data.syncingConnectionIds.length
			)
				clearInterval(pollInterval);
		}
	};

	let pollInterval: NodeJS.Timeout | undefined;
	$effect(() => {
		const ids = data.syncingConnectionIds;
		if (!ids.length) return;

		pollInterval = setInterval(() => untrack(updateSyncStatus), 5000);
		return () => {
			clearInterval(pollInterval);
			pollInterval = undefined;
		};
	});

	const isRoot = $derived(page.url.pathname.endsWith(wishlist.slug));
</script>

<div class="flex h-full w-full flex-col justify-evenly">
	<div class="border-b border-border px-5 py-4 shadow">
		<h1 class="text-2xl font-semibold">{wishlist.name}</h1>
		<p class="text-lg font-light italic">
			{#if isOwn}
				by {wishlist.user.name}
				<span class="font-bold text-danger not-italic">(You)</span>
			{:else}
				by
				<a
					class="underline hover:text-accent focus:text-accent active:text-accent"
					href={UrlBuilder.from('/users').segment(wishlist.userId).toPath()}
				>
					{wishlist.user.name}
				</a>
			{/if}
		</p>

		{#if isRoot}
			{#if connections.length}
				<div class="pt-4">
					<p class="flex items-center gap-2 font-bold">
						<LinkIcon size={16} />
						Connected to
					</p>

					<div class="flex flex-wrap gap-x-4 gap-y-1">
						{#each connections as connection, i}
							{@const isSyncing =
								hasJs() && data.syncingConnectionIds.includes(connection.id)}

							<div
								title="Last synced {connection.lastSyncedAt
									? formatRelative(connection.lastSyncedAt)
									: 'never'}"
							>
								<WishlistConnection
									{connection}
									syncing={isSyncing}
									showLastSync={false}
								/>
							</div>

							{#if i !== connections.length - 1}
								<div class="w-px bg-border"></div>
							{/if}
						{/each}
					</div>
				</div>
			{:else if isOwn}
				<a
					href="/lists/{wishlist.slug}/edit"
					class="mt-3 flex items-center gap-2 text-base text-accent"
				>
					<LinkIcon size={18} />

					Connect your <span class="text-warning">Amazon</span> or other list
				</a>
			{/if}
		{/if}

		{#if badges.length || !isRoot}
			<div class="mt-4 flex flex-wrap items-center gap-4">
				{#if !isRoot}
					<a title="Go Back" href="/lists/{wishlist.slug}">
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

		{#if isRoot}
			<div
				class="mt-2 -mb-2 flex flex-wrap items-center gap-0.5 border-t border-border/50 pt-1.5 text-xs text-text-muted"
			>
				<p>{wishlist.items.length} items</p>
				<DotIcon />
				<p>Last updated {formatRelative(wishlist.activityAt, clock.now)}</p>
			</div>
		{/if}
	</div>

	<div class="h-full w-full">
		{#if description && isRoot}
			<div class="m-4 mb-0 rounded-sm border border-accent/50 bg-accent/10 p-4 shadow-sm">
				<p class="text-base wrap-break-word whitespace-pre-wrap">
					{description}
				</p>
			</div>
		{/if}

		{@render children()}
	</div>
</div>
