<script lang="ts">
	import {
		deleteWishlistConnection,
		syncWishlistConnection,
	} from '$lib/remotes/connection.remote';
	import { clock } from '$lib/runes/clock.svelte';
	import type { WishlistConnection } from '$lib/schemas/connection';
	import { formatRelative } from '$lib/util/date';
	import { asIssue } from '$lib/util/pick-issue';
	import { ExternalLinkIcon, RefreshCwIcon, Trash2Icon } from '@lucide/svelte';
	import ms from 'ms';
	import Loader from './loader.svelte';
	let {
		connection,
		syncing = false,
		manage,
	}: {
		connection: WishlistConnection;
		syncing?: boolean;
		manage?: { id: string; lastSync?: Date | null };
	} = $props();

	const manualSyncTimeout = ms('1h');
	const nextSync = $derived.by(() => {
		if (!manage) return;

		const lastSync = manage.lastSync;
		if (!lastSync) return;

		const msUntilSync = manualSyncTimeout - (clock.now.getTime() - lastSync.getTime());
		if (msUntilSync) return new Date(clock.now.getTime() + msUntilSync);
	});

	const nextSyncLabel = $derived.by(() => (nextSync ? formatRelative(nextSync) : 'now'));
</script>

<div class="flex flex-wrap items-center gap-2">
	{#if syncing}
		<div title="Syncing this connection" class="size-4">
			<Loader thickness="1px" pulseCount={2} pulseDur="1s" pulseStaggerDur="300ms" />
		</div>
	{:else}
		<ExternalLinkIcon size={16} />
	{/if}

	<div>
		<a href={connection.url} target="_blank" class="text-accent">{connection.name}</a>

		{#if manage?.lastSync}
			<p class="w-full text-sm text-text-muted">
				Last sync {formatRelative(manage.lastSync, clock.now)}
			</p>
		{/if}
	</div>

	{#if manage}
		{@const deleteHandler = deleteWishlistConnection.for(manage.id)}
		{@const syncHandler = syncWishlistConnection.for(manage.id)}
		{@const anyIssue = asIssue(
			deleteHandler.fields.issues() || asIssue(syncHandler.fields.issues()),
		)}

		{@const isSyncing = syncing || !!syncHandler.pending}

		<div class="ms-auto flex gap-2">
			<form {...deleteHandler}>
				<input {...deleteHandler.fields.connectionId.as('hidden', manage.id)} />
				<input {...deleteHandler.fields.deleteItems.as('hidden', 'true')} />

				<button class="border-border/50 p-2 text-danger" {...deleteHandler.buttonProps}>
					<Trash2Icon size={18} />
				</button>
			</form>

			<form {...syncHandler}>
				<input {...syncHandler.fields.connectionId.as('hidden', manage.id)} />

				<button
					class="border-border/50 p-2"
					title="Next sync available {nextSyncLabel}"
					disabled={isSyncing || !!nextSync}
					{...syncHandler.buttonProps}
				>
					<RefreshCwIcon size={18} class={isSyncing ? 'animate-spin' : ''} />
				</button>
			</form>
		</div>

		{#if anyIssue}
			<p class="font-sm w-full text-danger">{anyIssue}</p>
		{/if}
	{/if}
</div>
