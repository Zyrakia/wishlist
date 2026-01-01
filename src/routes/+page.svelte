<script lang="ts">
	import UserIntro from '$lib/components/user-intro.svelte';
	import WishlistSummary from '$lib/components/wishlist-summary.svelte';
	import { resolveGroupInvite } from '$lib/remotes/group.remote';
	import { clock } from '$lib/runes/clock.svelte';
	import { seen } from '$lib/runes/seen-ids.svelte';
	import { formatRelative } from '$lib/util/date';
	import { asIssue } from '$lib/util/pick-issue';
	import {
		ArrowRightIcon,
		BellDotIcon,
		FlameIcon,
		ListPlusIcon,
		ScrollTextIcon,
		UsersIcon,
		type Icon as IconType,
	} from '@lucide/svelte';
	import ms from 'ms';
	import type { Snippet } from 'svelte';

	let { data } = $props();
	const user = $derived(data.user);

	const wishlists = $derived(data.wishlists);
	const groups = $derived(data.groups);
	const invites = $derived(data.invites);

	const oneDayMs = ms('1d');
</script>

{#snippet section(Icon: typeof IconType, title: string, children: Snippet<[]>)}
	<section class="relative w-full">
		<p class="flex flex-1 gap-2 font-bold">
			<Icon size={20} />
			{title}
		</p>

		<hr class="mt-2 mb-3 border border-dashed border-accent/30" />

		{@render children()}
	</section>
{/snippet}

<div class="flex h-full flex-col gap-12 px-6 py-12">
	<UserIntro name={user.name} />

	{#if invites.length}
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<div class="relative">
					<span class="absolute top-1 right-0.5 flex size-2">
						<span
							class="absolute -top-0.5 -right-0.5 size-3 animate-ping rounded-full bg-success opacity-75"
						></span>
						<span class="relative h-full w-full rounded-full bg-success"></span>
					</span>

					<BellDotIcon />
				</div>
				<p>You have pending group invites!</p>
			</div>

			<div
				class="flex flex-nowrap gap-4 overflow-x-auto overflow-y-hidden scroll-smooth pb-1.5"
			>
				{#each invites as invite}
					{@const inviteHandler = resolveGroupInvite.for(invite.id)}
					{@const issue = asIssue(inviteHandler.fields.allIssues())}

					<div
						class="flex flex-none flex-col gap-2 rounded border border-border bg-surface p-4"
					>
						<p>
							<span class="font-bold">{invite.group.owner.name}</span>
							invited you to
							<span class="font-bold text-success">{invite.group.name}</span>
						</p>

						<form class="flex gap-2" {...inviteHandler}>
							<input {...inviteHandler.fields.inviteId.as('hidden', invite.id)} />

							<button
								name="decision"
								value="accept"
								class="w-full bg-success text-accent-fg">Accept</button
							>

							<button
								name="decision"
								value="decline"
								class="w-full bg-danger text-accent-fg">Decline</button
							>
						</form>

						{#if issue}
							<p class="w-full pt-2 text-danger">{issue}</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#snippet wishlistSection()}
		<a
			class="button absolute -top-3.5 right-0 flex h-9 w-max items-center gap-2 border-border bg-success text-accent-fg"
			href="/new-list"
		>
			<ListPlusIcon size={18} />
			<span>New List</span>
		</a>

		{#if wishlists.length}
			<div
				class="grid w-full grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]"
			>
				{#each wishlists as wishlist}
					<WishlistSummary {wishlist}>
						{#snippet footer()}
							<hr class="my-2 border-border" />
							<p class="text-xs font-light text-text-muted">
								Last activity
								{formatRelative(wishlist.activityAt, clock.now)}
							</p>
						{/snippet}
					</WishlistSummary>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-2 py-6">
				<p class="text-center font-light italic">
					You have no wishlists, create your first one now!
				</p>

				<a href="/new-list" class="button mt-2 rounded bg-success px-4 py-3 text-accent-fg">
					Create Your First List
				</a>
			</div>
		{/if}
	{/snippet}

	{#snippet groupsSection()}
		{#if groups && !groups.find((v) => v.group.ownerId === user.id)}
			<a
				class="absolute top-0 right-0 flex w-max items-center gap-2 border-border italic dark:text-success"
				href="/new-group"
			>
				<span>Create your own</span>
				<ArrowRightIcon size={18} />
			</a>
		{/if}

		{#if groups.length}
			<div class="flex flex-col gap-4">
				{#each groups as { group, activity }, i}
					{@const isOwn = group.ownerId === user.id}

					{@const seenLists = groups
						.slice(0, i)
						.flatMap((v) => v.activity.map((v) => v.id))}

					{@const filteredActivity = activity.filter((v) => {
						if (seenLists.includes(v.id)) return false;
						return v.userId !== user.id;
					})}

					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<a
								href="/groups/{group.id}"
								class="flex items-center gap-2 font-bold hover:text-accent"
							>
								<UsersIcon size={16} />
								{group.name}

								{#if isOwn}
									<span class="text-sm font-semibold text-danger italic"
										>(Yours)</span
									>
								{/if}
							</a>

							<a
								href="/groups/{group.id}"
								class="ms-auto flex items-center gap-2 font-light italic hover:text-accent"
							>
								{#if isOwn}
									Manage
								{:else}
									View all lists
								{/if}

								<ArrowRightIcon size={16} />
							</a>
						</div>

						<div
							class="grid grid-cols-1 gap-4 border-s border-dashed border-border-strong/75 ps-3 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]"
						>
							{#if filteredActivity.length}
								{#each filteredActivity as wishlist}
									{@const wasUpdatedToday =
										Date.now() - wishlist.activityAt.getTime() <= oneDayMs}

									{@const seenLatestActivity = seen.hasSeen(
										wishlist.id,
										wishlist.activityAt.getTime(),
									)}

									<WishlistSummary {wishlist} author={wishlist.userName}>
										{#snippet footer()}
											{#if wasUpdatedToday && !seenLatestActivity}
												<p
													class="absolute top-0 right-0 flex max-w-1/2 items-center gap-4 rounded-bl border-b border-l border-border bg-success/15 px-4 py-2 text-sm font-normal"
												>
													<FlameIcon class="text-danger" size={18} />

													Updated
												</p>
											{/if}
										{/snippet}
									</WishlistSummary>
								{/each}
							{:else}
								<p>No recent activity</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-2 py-6">
				<p class="text-center font-light italic">
					Groups let you automatically share your lists with family, friends and everyone
					in between.
				</p>

				<a href="/new-group" class="button mt-2 bg-success px-4 py-3 text-accent-fg">
					Create Your Group
				</a>
			</div>
		{/if}
	{/snippet}

	{@render section(ScrollTextIcon, 'Your Wishlists', wishlistSection)}
	{@render section(UsersIcon, 'Your Groups', groupsSection)}
</div>
