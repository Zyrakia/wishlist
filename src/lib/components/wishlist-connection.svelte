<script lang="ts">
	import {
		deleteWishlistConnection,
		syncWishlistConnection,
	} from '$lib/remotes/connection.remote';
	import { clock } from '$lib/runes/clock.svelte';
	import type { WishlistConnection } from '$lib/schemas/connection';
	import { formatRelative } from '$lib/util/date';
	import { firstIssue, formatFirstIssue } from '$lib/util/issue';
	import { ExternalLinkIcon, RefreshCwIcon, Trash2Icon, XIcon } from '@lucide/svelte';
	import ms from 'ms';
	import Loader from './loader.svelte';
	import { assistantIndicator } from '$lib/runes/assistant-indicators.svelte';

	let {
		connection,
		showLastSync = true,
		syncing = false,
		manage = false,
	}: {
		connection: WishlistConnection & {
			id: string;
			lastSyncedAt: Date | null;
			syncError: boolean | null;
		};
		showLastSync?: boolean;
		syncing?: boolean;
		manage?: boolean;
	} = $props();

	const deleteHandler = deleteWishlistConnection.for(connection.id);
	const syncHandler = syncWishlistConnection.for(connection.id);

	const manualSyncTimeout = ms('1h');
	const nextSync = $derived.by(() => {
		const lastSync = connection.lastSyncedAt;
		if (!lastSync) return;

		const msUntilSync = manualSyncTimeout - (clock.now.getTime() - lastSync.getTime());
		if (msUntilSync >= 0) return new Date(clock.now.getTime() + msUntilSync);
	});

	const nextSyncLabel = $derived.by(() => (nextSync ? formatRelative(nextSync) : 'now'));

	$effect(() => {
		if (!manage) return;

		const issue = formatFirstIssue(syncHandler.fields);
		if (!issue) return;

		return assistantIndicator('sync-error', {
			context: issue,
			suggestedPrompt: {
				prompt: "What's wrong with my connection?",
				color: 'var(--color-danger)',
			},
		});
	});
</script>

<div class="flex flex-wrap items-center gap-2">
	{#if connection.syncError}
		<div title="Error syncing this connection">
			<XIcon size={16} class="text-danger" />
		</div>
	{:else if syncing}
		<div title="Syncing this connection" class="size-4">
			<Loader thickness="1px" pulseCount={2} pulseDur="1s" pulseStaggerDur="300ms" />
		</div>
	{:else}
		<ExternalLinkIcon size={16} />
	{/if}

	<div>
		<a href={connection.url} target="_blank" class="text-accent">{connection.name}</a>

		{#if connection.lastSyncedAt && showLastSync}
			<p class="w-full text-sm text-text-muted">
				Last sync {formatRelative(connection.lastSyncedAt, clock.now)}
			</p>
		{/if}
	</div>

	{#if manage}
		{@const anyIssue =
			firstIssue(deleteHandler.fields.issues()) || firstIssue(syncHandler.fields.issues())}

		{@const isSyncing = (syncing && !connection.syncError) || !!syncHandler.pending}

		<div class="ms-auto flex gap-2">
			<form {...deleteHandler}>
				<input {...deleteHandler.fields.connectionId.as('hidden', connection.id)} />
				<input {...deleteHandler.fields.deleteItems.as('hidden', 'true')} />

				<button class="border-border/50 p-2 text-danger" {...deleteHandler.buttonProps}>
					<Trash2Icon size={18} />
				</button>
			</form>

			<form {...syncHandler}>
				<input {...syncHandler.fields.connectionId.as('hidden', connection.id)} />

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
