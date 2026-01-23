<script lang="ts">
	import Loader from '$lib/components/loader.svelte';
	import { forceResync, listErroredConnections, listUsers } from '$lib/remotes/admin.remote';
	import { formatRelative } from '$lib/util/date';
	import {
		ArrowBigLeftIcon,
		ArrowBigRightIcon,
		CloudAlertIcon,
		ExternalLinkIcon,
		RefreshCwIcon,
		SquareUserIcon,
	} from '@lucide/svelte';

	const usersPagination = $state({ page: 0, limit: 10 });
	const connPagination = $state({ page: 0, limit: 10 });

	const usersQ = $derived(
		listUsers({
			page: usersPagination.page,
			limit: usersPagination.limit,
		}),
	);

	const connQ = $derived(
		listErroredConnections({
			page: connPagination.page,
			limit: connPagination.limit,
		}),
	);

	const maxUsersPage = $derived.by(() => {
		const res = usersQ.current;
		if (!res) return 0;

		return Math.floor(res.total / usersPagination.limit) - 1;
	});

	const maxConnPage = $derived.by(() => {
		const res = connQ.current;
		if (!res) return 0;

		return Math.floor(res.total / connPagination.limit) - 1;
	});

	const toUsersPage = (page: number) => void (usersPagination.page = page);
	const toConnectionsPage = (page: number) => void (connPagination.page = page);
</script>

{#snippet pageControls(current: number, max: number, onChange: (page: number) => void)}
	<div class="flex items-center gap-4">
		<button
			disabled={current === 0}
			onclick={() => {
				if (current > 0) onChange(current - 1);
			}}
		>
			<ArrowBigLeftIcon />
		</button>

		<span class="text-center text-sm">Page {current + 1}</span>

		<button
			disabled={current >= max}
			onclick={() => {
				if (current < max) onChange(current + 1);
			}}
		>
			<ArrowBigRightIcon />
		</button>
	</div>
{/snippet}

<div class="flex flex-col items-center gap-2 sm:p-4 md:p-8">
	<section class="float-container flex flex-col p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold">Users</h2>
			{@render pageControls(usersPagination.page, maxUsersPage, toUsersPage)}
		</div>

		<div class="flex flex-col gap-3 divide-y divide-border">
			{#await usersQ}
				<div class="mx-auto size-16">
					<Loader />
				</div>
			{:then { data }}
				{#each data as user}
					<div class="flex flex-col gap-1 pb-3">
						<p class="flex items-center gap-2 font-medium">
							<SquareUserIcon size={20} />
							{user.name}
						</p>
						<p class="text-sm text-text-muted">{user.email}</p>
						<p class="text-xs text-text-muted">
							Member since {formatRelative(user.createdAt)}
						</p>
					</div>
				{/each}
			{/await}
		</div>
	</section>

	<section class="float-container flex flex-col p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold">Errored Connections</h2>
			{@render pageControls(connPagination.page, maxConnPage, toConnectionsPage)}
		</div>

		<div class="flex flex-col gap-3 divide-y divide-border">
			{#await connQ}
				<div class="mx-auto size-16">
					<Loader />
				</div>
			{:then { data }}
				{#if data.length}
					{#each data as conn (conn.id)}
						{@const resyncHandler = forceResync.for(conn.id)}

						<div class="flex items-center pb-3">
							<div class="flex flex-1 flex-col gap-1">
								<p class="flex items-center gap-2 font-medium">
									<CloudAlertIcon size={20} class="text-danger" />
									{conn.name}
								</p>

								<a
									class="flex items-center gap-2 text-sm text-text-muted underline hover:text-accent"
									target="_blank"
									href="/lists/{conn.wishlist.slug}"
								>
									<ExternalLinkIcon size={16} />
									{conn.wishlist.user.name}
								</a>
							</div>

							<form {...resyncHandler}>
								<input
									{...resyncHandler.fields.connectionId.as('hidden', conn.id)}
								/>

								<button
									class="p-2"
									disabled={!!resyncHandler.pending}
									{...resyncHandler.buttonProps}
								>
									<RefreshCwIcon
										size={20}
										class={!!resyncHandler.pending
											? 'animate-spin'
											: 'animate-none'}
									/>
								</button>
							</form>
						</div>
					{/each}
				{:else}
					<p class="text-text-muted italic">No broken connections.</p>
				{/if}
			{/await}
		</div>
	</section>
</div>
