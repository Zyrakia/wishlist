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
	<div class="flex w-full flex-col gap-6 px-6 py-12">
		<UserIntro name={data.user.name} />

		<div class="w-full">
			<p class="flex flex-wrap items-center gap-4 font-bold">
				{#if sort === 'modified'}
					Your recent list activity
				{:else}
					Your lists
				{/if}

				<a
					href="?sort={sort === 'modified' ? 'created' : 'modified'}"
					class="ms-auto flex items-center gap-2 py-1 font-light hover:text-accent"
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

			<hr class="mb-3 border-dashed" />

			{#if (await wishlists).length}
				<div class="flex w-full flex-wrap gap-4">
					<a
						href="/new-list"
						class="button flex flex-col items-center justify-evenly bg-success text-accent-fg"
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
									<p class="text-xs font-light text-text-muted">
										Modified
										{dtf.format(modDate)}
									</p>
								{/if}
							{/snippet}
						</WishlistSummary>
					{/each}
				</div>
			{:else}
				<div class="flex flex-col items-center gap-2 py-6">
					<p class="font-light italic">You have no wishlists...</p>

					<a
						href="/new-list"
						class="button rounded bg-success px-4 py-2 text-accent-fg"
					>
						Create Your First List
					</a>
				</div>
			{/if}
		</div>
	</div>
{/if}
