<script lang="ts">
	import { page } from '$app/state';
	import UserIntro from '$lib/components/user-intro.svelte';
	import WishlistSummary from '$lib/components/wishlist-summary.svelte';
	import { getWishlistActivity, getWishlists } from '$lib/remotes/wishlist.remote.js';
	import { FlameIcon, LayoutGridIcon, MoveUpIcon, PlusIcon } from '@lucide/svelte';
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
	const dtf = new Intl.DateTimeFormat(navigator.languages, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
</script>

{#if data.user}
	<div class="w-full px-6 py-12 flex flex-col gap-6">
		<UserIntro name={data.user.name} />

		<div class="w-full">
			<p class="font-bold flex items-center flex-wrap gap-4">
				{#if sort === 'modified'}
					Your recent list activity
				{:else}
					Your lists
				{/if}

				<a
					href="?sort={sort === 'modified' ? 'created' : 'modified'}"
					class="flex items-center py-1 gap-2 hover:text-blue-600 font-light ms-auto"
				>
					{#if sort === 'modified'}
						[<LayoutGridIcon size={16} />
						View all lists ]
					{:else}
						[<FlameIcon size={16} />
						View recent activity ]
					{/if}
				</a>
			</p>

			<hr class="border-dashed mb-3" />

			{#if (await wishlists).length}
				<div class="w-full flex flex-wrap gap-4">
					<a
						href="/new-list"
						class="button bg-green-200 flex flex-col justify-evenly items-center"
					>
						<PlusIcon />
						Add List
					</a>

					{#each await wishlists as wishlist}
						<WishlistSummary {wishlist}>
							{#snippet footer()}
								{#if sort === 'modified'}
									{@const modDate = new Date(wishlist.updatedAt)}

									<hr class="my-2" />
									<p class="font-light text-xs text-neutral-500">
										Modified
										{dtf.format(modDate)}
									</p>
								{/if}
							{/snippet}
						</WishlistSummary>
					{/each}
				</div>
			{:else}
				<div class="flex flex-col gap-2 items-center py-6">
					<p class="italic font-light">You have no wishlists...</p>

					<a href="/new-list" class="button bg-green-200 px-4 py-2 rounded">
						Create Your First List
					</a>
				</div>
			{/if}
		</div>
	</div>
{/if}
