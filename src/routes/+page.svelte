<script lang="ts">
	import WishlistSummary from '$lib/components/wishlist-summary.svelte';
	import { getWishlistActivity } from '$lib/remotes/wishlist.remote.js';
	import { MoonIcon, MoveRightIcon, SunIcon, SunMoonIcon } from '@lucide/svelte';

	let { data } = $props();

	const hourOfDay = new Date().getHours();
	const periodOfDay =
		hourOfDay < 6
			? 'early morning'
			: hourOfDay < 12
				? 'morning'
				: hourOfDay < 18
					? 'afternoon'
					: 'evening';

	const activityQuery = getWishlistActivity({ limit: 5 });

	const dtf = new Intl.DateTimeFormat(navigator.languages, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
</script>

{#if data.user}
	<div class="w-full px-6 py-12 flex flex-col gap-6">
		<div class="flex gap-3 items-center">
			<p>
				{#if periodOfDay === 'early morning'}
					<MoonIcon class="text-purple-600" size={32} />
				{:else if periodOfDay === 'morning'}
					<SunMoonIcon class="text-amber-500" size={32} />
				{:else if periodOfDay === 'afternoon'}
					<SunIcon class="text-orange-500" size={32} />
				{:else if periodOfDay === 'evening'}
					<SunMoonIcon class="text-violet-600" size={32} />
				{/if}
			</p>

			<h1 class="text-3xl">
				Good {periodOfDay},
				<span class="font-semibold">{data.user.name}</span>
			</h1>
		</div>

		<div class="w-full">
			<p class="font-bold flex items-center flex-wrap gap-4">
				Your recent list activity

				<a
					href="/lists"
					class="flex items-center py-1 gap-2 hover:text-blue-600 font-light ms-auto"
				>
					[<MoveRightIcon size={16} />
					View all lists ]
				</a>
			</p>

			<hr class="border-dashed mb-1" />

			{#if (await activityQuery).length}
				<div class="w-full flex flex-wrap gap-x-4">
					{#each await activityQuery as { wishlist, lastItemAt }}
						<WishlistSummary {wishlist}>
							{#snippet footer()}
								{#if lastItemAt || wishlist.createdAt}
									{@const modDate = new Date(
										lastItemAt * 1000 || wishlist.createdAt.getTime(),
									)}

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

					<a href="/new-list" class="button bg-green-200 px-4 py-2 rounded"
						>Add Wishlist</a
					>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<h1>Please log in</h1>
{/if}
