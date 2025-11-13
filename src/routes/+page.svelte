<script lang="ts">
	import { page } from '$app/state';
	import UserIntro from '$lib/components/user-intro.svelte';
	import WishlistSummary from '$lib/components/wishlist-summary.svelte';
	import {
		getCirclesActivity,
		getCircleInvites,
		resolveCircleInvite,
	} from '$lib/remotes/circle.remote.js';
	import { getWishlistActivity, getWishlists } from '$lib/remotes/wishlist.remote.js';
	import { asIssue } from '$lib/util/pick-issue';
	import {
		ArrowRightIcon,
		BellDotIcon,
		CircleIcon,
		FlameIcon,
		LayoutGridIcon,
		PlusIcon,
		UsersIcon,
	} from '@lucide/svelte';
	import z from 'zod';

	let { data } = $props();
	const user = $derived(data.user);

	const sortSchema = z.enum(['modified', 'created']);
	const sort = $derived.by(() =>
		sortSchema.parse(page.url.searchParams.get('sort') ?? 'modified'),
	);

	const limit = $state(10);
	// const page = $state(0);
	const wishlists = $derived(
		sort === 'modified' ? getWishlistActivity({ limit: 2 }) : getWishlists({ limit }),
	);

	const circles = getCirclesActivity();
	const circleInvites = getCircleInvites();

	const dtf = new Intl.DateTimeFormat(navigator.languages, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
</script>

<div class="flex w-full flex-col gap-12 px-6 py-12">
	<UserIntro name={user.name} />

	{#if (await circleInvites).length}
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
				<p>You have pending circle invites!</p>
			</div>

			<div
				class="flex flex-nowrap gap-4 overflow-x-auto overflow-y-hidden scroll-smooth pb-1.5"
			>
				{#each await circleInvites as invite}
					{@const inviteHandler = resolveCircleInvite.for(invite.id)}
					{@const issue = asIssue(inviteHandler.fields.allIssues())}

					<div
						class="flex flex-none flex-col gap-2 rounded border border-border bg-surface p-4"
					>
						<p>
							<span class="font-bold">{invite.circle.owner.name}</span>
							invited you to
							<span class="font-bold text-success">{invite.circle.name}</span>
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

	<div class="w-full">
		<p class="flex flex-wrap gap-2 font-bold">
			<span class="flex flex-1 gap-2">
				{#if sort === 'modified'}
					<FlameIcon />
					Your recent list activity
				{:else}
					<LayoutGridIcon />
					Your lists
				{/if}
			</span>

			<a
				href="?sort={sort === 'modified' ? 'created' : 'modified'}"
				class="font-light italic hover:text-accent"
			>
				{#if sort === 'modified'}
					View all lists
				{:else}
					View recent activity
				{/if}
			</a>
		</p>

		<hr class="mt-2 mb-3 border-dashed border-border" />

		{#if (await wishlists).length}
			<div class="flex w-full flex-wrap gap-4">
				<a
					href="/new-list"
					class="button flex min-h-16 w-full flex-wrap items-center justify-center gap-x-2 bg-success text-accent-fg sm:w-36"
				>
					<PlusIcon />
					Add List
				</a>

				{#each await wishlists as wishlist}
					<WishlistSummary {wishlist}>
						{#snippet footer()}
							{#if sort === 'modified'}
								{@const activityDate = new Date(wishlist.activityAt)}

								<hr class="my-2" />

								<p class="text-xs font-light text-text-muted">
									Last activity
									{dtf.format(activityDate)}
								</p>
							{/if}
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
	</div>

	<div class="w-full">
		<div class="flex flex-wrap gap-2 font-bold">
			<p class="flex flex-1 items-center gap-2">
				<CircleIcon />
				Your circles activity
			</p>
		</div>

		<hr class="mt-2 mb-3 border-dashed border-border" />

		{#if (await circles).length}
			<div class="flex flex-col gap-4">
				{#each await circles as { circle, activity }}
					{@const isOwn = circle.ownerId === user.id}
					{@const notMyAcitivty = activity.filter((v) => v.userId !== user.id)}

					<div class="flex flex-col gap-2">
						<div class="flex gap-2">
							<p class="flex flex-1 items-center gap-2 font-bold">
								<UsersIcon size={16} />
								{circle.name}
							</p>

							<a
								href="/circles/{circle.id}"
								class="flex items-center gap-2 font-light italic hover:text-accent"
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
							class="grid grid-cols-1 gap-4 border-s border-dashed border-border-strong/75 ps-3 sm:grid-cols-[repeat(auto-fit,minmax(16rem,max-content))]"
						>
							{#if notMyAcitivty.length}
								{#each notMyAcitivty as wishlist}
									<WishlistSummary {wishlist} author={wishlist.userName} />
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
					Circles let you automatically share your lists with family, friends and everyone
					in between.
				</p>

				<a href="/new-circle" class="button mt-2 bg-success px-4 py-3 text-accent-fg">
					Create Your Circle
				</a>
			</div>
		{/if}
	</div>
</div>
