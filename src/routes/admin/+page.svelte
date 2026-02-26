<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { forceResync } from '$lib/remotes/admin.remote';
	import { formatRelative } from '$lib/util/date';
	import type { PageData } from './$types';
	import {
		ArrowBigLeftIcon,
		ArrowBigRightIcon,
		BadgeCheckIcon,
		CloudAlertIcon,
		ExternalLinkIcon,
		ShieldCheckIcon,
		RefreshCwIcon,
		SquareUserIcon,
		UsersRoundIcon,
	} from '@lucide/svelte';

	const { data }: { data: PageData } = $props();

	const limit = $state(10);

	let targetUsersPage = $state(Number(page.url.searchParams.get('userPage') ?? 0));
	let targetConnectionsPage = $state(Number(page.url.searchParams.get('connectionsPage') ?? 0));

	const users = $derived(data.users.data);
	const usersTotal = $derived(data.users.total);
	const maxUsersPage = $derived.by(() => {
		return Math.max(0, Math.ceil(usersTotal / limit) - 1);
	});

	const connections = $derived(data.connections.data);
	const connectionsTotal = $derived(data.connections.total);
	const maxConnPage = $derived.by(() => {
		return Math.max(0, Math.ceil(connectionsTotal / limit) - 1);
	});

	const usersPage = $derived(Math.max(0, Math.min(maxUsersPage, targetUsersPage)));
	const connectionsPage = $derived(Math.max(0, Math.min(maxConnPage, targetConnectionsPage)));
	const usersPageCount = $derived(maxUsersPage + 1);
	const connectionsPageCount = $derived(maxConnPage + 1);
	const hasErroredConnections = $derived(connectionsTotal > 0);

	const setQuery = async (nextUsersPage: number, nextConnectionsPage: number) => {
		const currentUsersPage = Number(page.url.searchParams.get('userPage') ?? 0);
		const currentConnectionsPage = Number(page.url.searchParams.get('connectionsPage') ?? 0);

		if (currentUsersPage === nextUsersPage && currentConnectionsPage === nextConnectionsPage)
			return;

		const url = new URL(page.url);
		url.searchParams.set('userPage', String(nextUsersPage));
		url.searchParams.set('connectionsPage', String(nextConnectionsPage));

		await goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	};

	$effect(() => {
		setQuery(usersPage, connectionsPage);
	});

	const toUsersPage = (next: number) => {
		targetUsersPage = Math.max(0, Math.min(maxUsersPage, next));
	};

	const toConnectionsPage = (next: number) => {
		targetConnectionsPage = Math.max(0, Math.min(maxConnPage, next));
	};
</script>

{#snippet pageControls(current: number, max: number, onChange: (page: number) => void)}
	<div
		class="flex items-center gap-2 rounded-full border border-border-strong/60 bg-background/65 p-1"
	>
		<button
			type="button"
			disabled={current === 0}
			class="grid h-8 w-8 place-items-center rounded-full border-none p-0"
			onclick={() => {
				if (current > 0) onChange(current - 1);
			}}
		>
			<ArrowBigLeftIcon size={18} />
		</button>

		<span class="min-w-16 text-center text-xs font-semibold tracking-wide text-text-muted">
			{current + 1} / {max + 1}
		</span>

		<button
			type="button"
			disabled={current >= max}
			class="grid h-8 w-8 place-items-center rounded-full border-none p-0"
			onclick={() => {
				if (current < max) onChange(current + 1);
			}}
		>
			<ArrowBigRightIcon size={18} />
		</button>
	</div>
{/snippet}

<div class="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 md:py-10">
	<section class="rounded-lg border border-border bg-surface p-5 md:p-7">
		<div class="grid w-full grid-cols-1 sm:grid-cols-2">
			<div class="rounded-lg border border-border bg-background/65 px-3 py-3">
				<p class="text-xs text-text-muted">Users</p>
				<p class="mt-1 text-lg font-semibold text-accent">{usersTotal}</p>
			</div>

			<div class="rounded-lg border border-border bg-background/65 px-3 py-3">
				<p class="text-xs text-text-muted">Errored Connections</p>
				<p
					class="mt-1 text-lg font-semibold {hasErroredConnections
						? 'text-danger'
						: 'text-success'}"
				>
					{connectionsTotal}
				</p>
			</div>
		</div>
	</section>

	<div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
		<section class="rounded-lg border border-border bg-surface p-5 md:p-6">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 class="mt-1 flex items-center gap-2 text-xl font-semibold">
					<UsersRoundIcon size={19} class="shrink-0 text-primary" />
					Users
				</h2>

				{@render pageControls(usersPage, maxUsersPage, toUsersPage)}
			</div>

			<div class="space-y-2">
				{#each users as user}
					<article class="rounded-lg border border-border bg-background/55 p-3">
						<div class="flex items-start justify-between gap-2">
							<p class="flex items-center gap-2 truncate font-semibold">
								<SquareUserIcon size={18} class="shrink-0 text-accent" />
								<a
									href="/users/{user.id}"
									class="truncate underline decoration-dotted underline-offset-3 hover:text-accent"
								>
									{user.name}
								</a>
							</p>
							<span class="text-[11px] text-text-muted"
								>{formatRelative(user.createdAt)}</span
							>
						</div>
						<p class="mt-1 truncate text-sm text-text-muted">{user.email}</p>
					</article>
				{/each}
			</div>
		</section>

		<section class="rounded-lg border border-border bg-surface p-5 md:p-6">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 class="mt-1 flex items-center gap-2 text-xl font-semibold">
					<CloudAlertIcon size={19} class="shrink-0 text-danger" />
					Errored Connections
				</h2>

				{@render pageControls(connectionsPage, maxConnPage, toConnectionsPage)}
			</div>

			<div class="space-y-2">
				{#if connections.length}
					{#each connections as conn (conn.id)}
						{@const resyncHandler = forceResync.for(conn.id)}

						<article class="rounded-lg border border-border bg-background/55 p-3">
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate font-semibold">{conn.name}</p>
									<a
										class="mt-1 inline-flex items-center gap-1 text-sm text-text-muted underline decoration-dotted underline-offset-3 hover:text-accent"
										target="_blank"
										href="/lists/{conn.wishlist.slug}"
									>
										<ExternalLinkIcon size={14} class="shrink-0" />
										{conn.wishlist.user.name}
									</a>
								</div>

								<form {...resyncHandler}>
									<input
										{...resyncHandler.fields.connectionId.as('hidden', conn.id)}
									/>

									<button
										class="inline-flex items-center gap-2 rounded-full border border-border-strong/80 bg-surface px-3 py-1.5 text-xs font-semibold"
										disabled={!!resyncHandler.pending}
										{...resyncHandler.buttonProps}
									>
										<RefreshCwIcon
											size={14}
											class={resyncHandler.pending
												? 'animate-spin text-accent'
												: ''}
										/>
										Resync
									</button>
								</form>
							</div>
						</article>
					{/each}
				{:else}
					<div class="rounded-lg border border-success/30 bg-success/8 p-3">
						<p class="flex items-center gap-2 text-sm text-text-muted">
							<BadgeCheckIcon size={16} class="text-success" />
							No broken connections right now.
						</p>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>
