<script lang="ts">
	import WishlistSummary from '$lib/components/wishlist-summary.svelte';
	import { CircleUserRoundIcon, ShieldUserIcon } from '@lucide/svelte';

	let { data } = $props();

	const circle = $derived(data.circle);
	const isOwn = $derived(data.isOwn);
	const members = $derived(data.members);

	const dtf = new Intl.DateTimeFormat(navigator.languages, {
		dateStyle: 'medium',
	});
</script>

<div class="flex flex-col p-4">
	<h3 class="mb-4 text-xl font-semibold">Members</h3>

	<ul class="flex flex-col gap-4 divide-y divide-accent/50">
		{#each members as { user: member, joinedAt }}
			{@const isOwner = member.id === circle.ownerId}
			{@const isMe = member.id === data.user?.id}

			<div class="flex flex-col gap-2">
				<p
					class="flex gap-2 font-bold"
					title="Circle {isOwner ? 'Owner' : 'Member'}{isMe ? ' (You)' : ''}"
				>
					<span class={isMe ? 'text-success' : isOwner ? 'text-danger' : 'text-accent'}>
						{#if isOwner}
							<ShieldUserIcon />
						{:else}
							<CircleUserRoundIcon />
						{/if}
					</span>

					{member.name}
				</p>

				<p class="text-sm font-light text-text-muted">
					Member since: {dtf.format(joinedAt)}
				</p>

				<div
					class="grid grid-cols-1 gap-3 pt-2 pb-4 sm:grid-cols-[repeat(auto-fit,minmax(16rem,max-content))]"
				>
					{#if !member.wishlists.length}
						<p class="font-light text-text-muted italic">No wishlists...</p>
					{:else}
						{#each member.wishlists as wishlist}
							<WishlistSummary {wishlist} />
						{/each}
					{/if}
				</div>
			</div>
		{/each}
	</ul>
</div>
