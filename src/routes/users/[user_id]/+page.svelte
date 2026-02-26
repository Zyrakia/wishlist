<script lang="ts">
	import WishlistSummary from '$lib/components/wishlist-summary.svelte';
	import { clock } from '$lib/runes/clock.svelte';
	import { formatDate, formatRelative } from '$lib/util/date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const user = $derived(data.user);
	const wishlists = $derived(data.wishlists);
</script>

<div class="grid min-h-full w-full place-items-center bg-background">
	<section class="float-container my-0 flex min-h-6/8 flex-col gap-3 bg-surface p-8">
		<div class="flex flex-col gap-2 border-b border-border-strong pb-3">
			<div class="flex items-center gap-6">
				<div
					class="grid size-12 shrink-0 place-items-center rounded-full border border-border-strong bg-muted"
				>
					{user.name.charAt(0)}
				</div>

				<div class="flex flex-col gap-1 overflow-hidden">
					<h1 class="flex-1 truncate text-3xl" title={user.name}>{user.name}</h1>
					<p
						class="text-sm text-text-muted"
						title={formatDate(user.createdAt, 'mediumDt')}
					>
						Joined {formatRelative(user.createdAt, clock.now)}
					</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-3">
			{#if wishlists.length}
				{#each wishlists as wishlist (wishlist.id)}
					<WishlistSummary {wishlist} />
				{/each}
			{:else}
				<p class="mt-5 text-center text-danger italic">This user has no lists.</p>
			{/if}
		</div>
	</section>
</div>
