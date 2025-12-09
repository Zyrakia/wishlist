<script lang="ts">
	import { removeReservation, reserveItem } from '$lib/remotes/reservation.remote';
	import type { WishlistConnection } from '$lib/schemas/connection';
	import { ExternalLinkIcon, ReceiptIcon, ReceiptTextIcon, XIcon } from '@lucide/svelte';
	import { slide } from 'svelte/transition';

	let {
		itemId,
		reservation,
		connection,
	}: {
		itemId: string;
		wishlistSlug: string;
		reservation?: { active: boolean; canModify: boolean };
		connection?: WishlistConnection;
	} = $props();

	const reserveModalId = $derived(`popover-reserve/${itemId}`);
</script>

<div
	class="mt-2.5 flex max-h-10 min-h-10 gap-2 px-1"
	in:slide={{ duration: 100 }}
	out:slide={{ duration: 100 }}
>
	{#if reservation}
		{#if reservation.canModify}
			{#if reservation.active}
				{@const reserveHandler = removeReservation.for(itemId)}
				<form {...reserveHandler}>
					<input {...reserveHandler.fields.itemId.as('hidden', itemId)} />

					<button
						disabled={!!reserveHandler.pending}
						title={reservation.active ? 'Remove Reservation' : 'Reserve Item'}
						class="flex h-max items-center border-border-strong bg-surface p-1.5 drop-shadow-sm drop-shadow-background"
					>
						<ReceiptIcon size={20} class="text-success" />
						<p class="px-1 text-sm">Remove Reservation</p>
					</button>
				</form>
			{:else}
				<button
					popovertarget={reserveModalId}
					title="Reserve Item"
					class="flex h-max items-center border-border-strong bg-surface p-1.5 drop-shadow-sm drop-shadow-background"
				>
					<ReceiptTextIcon size={20} />
					<p class="px-1 text-sm">Reserve</p>
				</button>
			{/if}
		{:else}
			<button
				disabled
				title={reservation.active ? 'Reserved' : 'Not Reserved'}
				class="flex h-max items-center border-border-strong bg-surface p-1.5 drop-shadow-sm drop-shadow-background disabled:brightness-85"
			>
				{#if reservation.active}
					<ReceiptIcon size={20} class="text-danger" />
				{:else}
					<ReceiptTextIcon size={20} />
				{/if}

				{#if reservation.active}
					<p class="px-1 text-sm">Someone has reserved this item</p>
				{/if}
			</button>
		{/if}
	{/if}

	{#if connection}
		<p class="flex max-w-1/2 items-center justify-end gap-2 text-text-muted">
			<a class="truncate text-accent hover:underline" href={connection.url}>
				{connection.name}
			</a>

			<ExternalLinkIcon class="shrink-0" size={18} />
		</p>
	{/if}
</div>

{#if reservation && reservation.canModify}
	{@const reserveHandler = reserveItem.for(itemId)}

	<div
		id={reserveModalId}
		popover="auto"
		class="float-container m-auto p-6 text-text transition-all backdrop:bg-black/80 backdrop:backdrop-blur open:scale-100 open:opacity-100 starting:open:scale-95 starting:open:opacity-0"
	>
		<div class="flex flex-col gap-4">
			<div class="flex items-center border-b border-border pb-2.5">
				<h2 class="me-auto text-2xl font-bold">Reserve Item</h2>

				<button
					type="button"
					popovertarget={reserveModalId}
					popovertargetaction="hide"
					class="p-1"
				>
					<XIcon class="text-danger" />
				</button>
			</div>

			<p>
				When you are in a group with the list owner, you are able to reserve items on their
				list. This will let other members know that the item is no longer available.
			</p>

			<p>
				Reservations are
				<span class="font-bold text-danger underline">invisible</span>
				to the list owner and logged out users, but
				<span class="font-bold text-success underline">visible</span>
				to all other members.
			</p>

			<form {...reserveHandler} class="flex gap-2">
				<input {...reserveHandler.fields.itemId.as('hidden', itemId)} />

				<button
					disabled={!!reserveHandler.pending}
					popovertarget={reserveModalId}
					popovertargetaction="hide"
					class="flex items-center gap-2 bg-success text-accent-fg"
					{...reserveHandler.buttonProps.enhance(async ({ submit }) => {
						document.getElementById(reserveModalId)?.hidePopover();
						await submit();
					})}
				>
					<ReceiptIcon />
					Confirm Reservation
				</button>

				<button
					type="button"
					popovertarget={reserveModalId}
					popovertargetaction="hide"
					class="bg-danger text-accent-fg"
				>
					Cancel
				</button>
			</form>
		</div>
	</div>
{/if}
