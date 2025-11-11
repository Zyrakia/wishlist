<script lang="ts">
	import { page } from '$app/state';
	import UserIntro from '$lib/components/user-intro.svelte';
	import WishlistSummary from '$lib/components/wishlist-summary.svelte';
	import { getCircleActivity } from '$lib/remotes/circle.remote.js';
	import { getWishlistActivity, getWishlists } from '$lib/remotes/wishlist.remote.js';
	import {
		ArrowRightIcon,
		CircleIcon,
		FlameIcon,
		LayoutGridIcon,
		PlusIcon,
	} from '@lucide/svelte';
	import z from 'zod';

	let { data } = $props();

	const sortSchema = z.enum(['modified', 'created']);
	const sort = $derived.by(() =>
		sortSchema.parse(page.url.searchParams.get('sort') ?? 'modified'),
	);

	const limit = $state(10);
	// const page = $state(0);
	const wishlists = $derived(
		sort === 'modified' ? getWishlistActivity({ limit: 5 }) : getWishlists({ limit }),
	);

	const circles = $derived(getCircleActivity());

	const dtf = new Intl.DateTimeFormat(navigator.languages, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
</script>

{#if data.user}
	<div class="flex w-full flex-col gap-12 px-6 py-12">
		<UserIntro name={data.user.name} />

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
						class="button flex min-h-16 w-full flex-col items-center justify-evenly bg-success text-accent-fg sm:w-32"
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

					<a
						href="/new-list"
						class="button mt-2 rounded bg-success px-4 py-3 text-accent-fg"
					>
						Create Your First List
					</a>
				</div>
			{/if}
		</div>

		<div class="w-full">
			<div class="flex flex-wrap gap-2 font-bold">
				<p class="flex items-center gap-2">
					<CircleIcon />
					Your circles activity
				</p>
			</div>

			<hr class="mt-2 mb-3 border-dashed border-border" />

			{#if (await circles).length}
				<div class="flex flex-col gap-4">
					{#each await circles as { circle, activity }}
						{@const isOwn = circle.ownerId === data.user.id}
						<div class="flex flex-col gap-2">
							<div class="flex gap-2">
								<p class="flex-1 font-bold">
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
								class="flex w-full flex-wrap gap-4 border-s border-dashed border-border/75 ps-3"
							>
								{#if activity.length}
									{#each activity as wishlist}
										<WishlistSummary {wishlist}>
											{#snippet footer()}
												{#if sort === 'modified'}
													{@const activityDate = new Date(
														wishlist.activityAt,
													)}

													<hr class="my-2" />
													<p class="text-xs font-light text-text-muted">
														Last activity
														{dtf.format(activityDate)}
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
						Circles let you automatically share your lists with family, friends and
						everyone in between.
					</p>

					<a href="/new-circle" class="button mt-2 bg-success px-4 py-3 text-accent-fg">
						Create Your Circle
					</a>
				</div>
			{/if}
		</div>
	</div>
{/if}
