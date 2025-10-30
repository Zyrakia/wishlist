<script lang="ts">
	import { getWishlistActivity } from '$lib/remotes/wishlist.remote.js';
	import { MoonIcon, SunIcon, SunMoonIcon } from '@lucide/svelte';

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

	const activityQuery = getWishlistActivity({ limit: 10 });
</script>

{#if data.user}
	<div class="w-full mx-6 my-12 flex flex-col gap-6">
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

		<div>
			<p class="font-light">Your recent list activity</p>
			<hr class="border-dashed" />

			{#if (await activityQuery).length}
				{#each await activityQuery as { wishlist, lastItemAt }}
					<a href="/{wishlist.slug}" class="flex flex-col p-3 border my-2">
						<p>Temporary wishlist</p>

						<p>{wishlist.name}</p>
						<p>{wishlist.description}</p>
						<p>{wishlist.slug}</p>
						<p>{new Date(lastItemAt).toISOString()}</p>
					</a>
				{/each}
			{:else}
				<div class="flex flex-col gap-2 items-center py-6">
					<p class="italic font-light">You have no wishlists...</p>

					<a href="/new-list" class="bg-green-200 px-4 py-2 rounded">Add Wishlist</a>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<h1>Please log in</h1>
{/if}
