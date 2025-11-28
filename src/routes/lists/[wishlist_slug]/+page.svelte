<script lang="ts">
	import WishlistItemToolbar from '$lib/components/wishlist-item-toolbar.svelte';
	import WishlistItem from '$lib/components/wishlist-item.svelte';
	import { deleteWishlist } from '$lib/remotes/wishlist.remote';
	import {
		Plus as AddIcon,
		ArrowDownNarrowWideIcon,
		ArrowDownWideNarrowIcon,
		ClipboardCheck as CopiedIcon,
		Settings2Icon as EditIcon,
		LinkIcon,
		MoveIcon,
		Share2 as ShareIcon,
		StarIcon,
		StarOffIcon,
		Trash2Icon,
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { flip } from 'svelte/animate';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { reorderItems, setItemFavorited } from '$lib/remotes/item.remote';
	import { MediaQuery, SvelteMap } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';

	let { data }: { data: PageData } = $props();

	const wishlist = $derived(data.wishlist);
	const isOwn = $derived(wishlist.userId === data.user?.id);

	let shareEnabled = $state(true);
	let copyConfirm = $state(false);
	const tryShare = async () => {
		if (!shareEnabled) return;

		if (navigator.share) {
			const payload: ShareData = {
				url: location.href,
				title: `Check out this wish list: ${wishlist.name}`,
				text: isOwn
					? `This is my wishlist: "${wishlist.name}"`
					: `This is ${wishlist.user.name}'s wishlist: "${wishlist.name}"`,
			};

			if (!navigator.canShare || navigator.canShare(payload)) {
				const res = navigator.share(payload);
				if (res instanceof Promise) return;
			}
		}

		if (navigator.clipboard) {
			try {
				shareEnabled = false;
				await navigator.clipboard.writeText(location.href);
				copyConfirm = true;

				setTimeout(() => {
					copyConfirm = false;
					shareEnabled = true;
				}, 2000);
			} catch (err) {}
		}
	};

	onMount(() => (shareEnabled = !!navigator.share || !!navigator.clipboard));

	let items = $state(data.wishlist.items);
	$effect(() => void (items = wishlist.items));

	const hasJs = useHasJs();

	const sort = $derived({ type: data.sort || 'user', dir: data.sortDirection || 'desc' });
	const sortKey = $derived(`${sort.type}:${sort.dir}`);
	const canDragSort = $derived(hasJs() && sort.type === 'user' && isOwn);

	let isReorganizing = $state(false);
	let organizationChangesPending = $state(false);
	let isSavingOrganization = $state(false);
	$effect(() => void (!canDragSort && (isReorganizing = false)));

	type DragEvent = CustomEvent<DndEvent<(typeof items)[number]>>;
	const onDragSortConsider = (ev: DragEvent) => (items = ev.detail.items);
	const onDragSortFinalize = async (ev: DragEvent) => {
		if (!canDragSort) return;
		const BOTTOM_GAP = 1000;

		items = ev.detail.items;

		const { id: itemId } = ev.detail.info;
		const newIndex = items.findIndex((v) => v.id === itemId);
		if (newIndex === -1) return;

		const prevItem = items[newIndex - 1];
		const nextItem = items[newIndex + 1];

		const prevOrder = prevItem?.order ?? 0;
		const nextOrder = nextItem?.order ?? 0;

		const gapTooSmall =
			prevOrder !== 0 && nextOrder !== 0 && Math.abs(nextOrder - prevOrder) < 0.00001;
		const needsReindex =
			(prevItem && prevOrder === 0) || (nextItem && nextOrder === 0) || gapTooSmall;

		if (needsReindex) {
			items = items.map((item, i) => {
				return { ...item, order: (i + 1) * BOTTOM_GAP };
			});
		} else {
			let newOrder = 0;

			if (!prevItem && !nextItem) newOrder = 0;
			else if (!prevItem) newOrder = nextItem.order / 2;
			else if (!nextItem) newOrder = prevItem.order + BOTTOM_GAP;
			else newOrder = (prevItem.order + nextItem.order) / 2;

			items[newIndex].order = newOrder;
		}

		organizationChangesPending = true;
	};

	const saveOrganization = async () => {
		while (isSavingOrganization) await new Promise((res) => setTimeout(res, 50));
		if (!organizationChangesPending) {
			isReorganizing = false;
			return;
		}

		isSavingOrganization = true;
		isReorganizing = false;

		await reorderItems({ items: items.map((v) => ({ id: v.id, order: v.order })) });

		isSavingOrganization = false;
		organizationChangesPending = false;
	};

	const favTogglesLoading = new SvelteMap<string, boolean>();

	const sortOptions: Record<string, string> = {
		['Default']: 'user:desc',
		['Price (Low to High)']: 'price:asc',
		['Price (High to Low)']: 'price:desc',
		['Created (Newest to Oldest)']: 'created:desc',
		['Created (Oldest to Newest)']: 'created:asc',
	};
</script>

<div class="mt-2 flex flex-wrap items-end gap-3 p-4">
	{#if isOwn}
		<a class="button bg-success text-accent-fg" href="/lists/{wishlist.slug}/item/generate">
			<AddIcon size={16} />
			<span>Add Item</span>
		</a>

		{#if hasJs() && items.length !== 0}
			<button
				class={['button', isReorganizing && 'bg-success text-accent-fg']}
				onclick={() => {
					if (isReorganizing) saveOrganization();
					else isReorganizing = true;
				}}
				disabled={!canDragSort || isSavingOrganization}
			>
				<MoveIcon size={16} />

				<span>
					{#if isReorganizing}
						Save
					{:else}
						Reorganize
					{/if}
				</span>
			</button>
		{/if}

		<a class="button" href="/lists/{wishlist.slug}/edit">
			<EditIcon size={16} />
			<span>Edit</span>
		</a>

		{#if isReorganizing}
			<button
				in:fade={{ duration: 300 }}
				out:fade={{ duration: 300 }}
				class="fixed right-6 bottom-24 z-50 flex items-center gap-2 rounded-xl bg-success text-accent-fg"
				onclick={saveOrganization}
				disabled={!canDragSort || isSavingOrganization}
			>
				<MoveIcon size={16} />

				Save
			</button>
		{/if}
	{/if}

	{#if hasJs() && !isOwn}
		<label class="relative flex flex-col gap-1 text-sm">
			<span>Sort Items</span>

			<select
				class="appearance-none pe-12"
				onchange={async (e) => {
					const [sort, dir] = e.currentTarget.value.split(':');
					const newSearchParams = new URLSearchParams(window.location.search);

					newSearchParams.set('sort', sort);
					newSearchParams.set('direction', dir);

					await goto(`?${newSearchParams.toString()}`, { replaceState: true });
				}}
			>
				{#each Object.entries(sortOptions) as [label, value]}
					<option {value} selected={value === sortKey}>{label}</option>
				{/each}
			</select>

			<div
				class="
			pointer-events-none absolute right-0 bottom-0
			flex items-center pe-3 pb-2.5 text-text-muted
		"
			>
				{#if sort.dir === 'desc'}
					<ArrowDownWideNarrowIcon size={16} />
				{:else}
					<ArrowDownNarrowWideIcon size={16} />
				{/if}
			</div>
		</label>
	{/if}

	<button
		disabled={!shareEnabled}
		onclick={tryShare}
		class="button h-max transition-colors"
		class:cursor-not-allowed={!shareEnabled}
	>
		{#if copyConfirm}
			<CopiedIcon size={16} />
			<span>Link Copied</span>
		{:else}
			<ShareIcon size={16} />
			<span>Share</span>
		{/if}
	</button>

	{#if isOwn}
		<form {...deleteWishlist} class="ms-auto">
			<input {...deleteWishlist.fields.id.as('hidden', data.wishlist.id)} />
			<input {...deleteWishlist.fields.slug.as('hidden', data.wishlist.slug)} />
			<input {...deleteWishlist.fields.confirm.as('hidden', 'no')} />

			<button class="border-0 bg-transparent text-danger" {...deleteWishlist.buttonProps}>
				<Trash2Icon />
			</button>
		</form>
	{/if}
</div>

<div
	use:dndzone={{
		items,
		flipDurationMs: 200,
		dragDisabled: !canDragSort || !isReorganizing,
		centreDraggedOnCursor: true,
		dropAnimationDisabled: true,
		delayTouchStart: true,
		dropTargetStyle: { outline: 'none' },
	}}
	onconsider={onDragSortConsider}
	onfinalize={onDragSortFinalize}
	class="grid w-full grid-cols-1 place-items-center gap-x-6 gap-y-4 px-4 pt-2 pb-12 transition-[padding] duration-700 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
	class:px-8={isReorganizing}
>
	{#if items.length !== 0}
		{#each items as item (item.id)}
			{@const isFavorited = favTogglesLoading.get(item.id) ?? item.favorited}

			<div animate:flip={{ duration: 200 }} class="h-full w-full">
				<WishlistItem {item} interactive={!isReorganizing} highlighted={isFavorited}>
					{#snippet footer()}
						{#if isReorganizing}
							<div
								in:fade={{ duration: 300 }}
								out:fade={{ duration: 300 }}
								class="absolute top-0 left-0 z-10 grid h-full w-full place-items-center rounded-xl bg-black/35 ring-4 ring-accent/50 dark:bg-black/50 dark:ring-2"
							>
								<MoveIcon size={32} class="text-white" />
							</div>
						{:else if isOwn}
							{@const connection = wishlist.connections.find(
								(v) => v.id === item.connectionId,
							)}

							{@const favHandler = setItemFavorited.for(item.id)}

							{#if connection}
								<p class="mt-2 flex h-12 items-center gap-2 text-text-muted">
									<LinkIcon size={18} />

									Controlled by

									<a class="text-accent hover:underline" href={connection.url}>
										{connection.name}
									</a>
								</p>
							{:else}
								<WishlistItemToolbar
									itemId={item.id}
									wishlistSlug={wishlist.slug}
								/>
							{/if}

							<form {...favHandler} class="absolute -top-1.5 -right-1.5">
								<input {...favHandler.fields.itemId.as('hidden', item.id)} />
								<input
									{...favHandler.fields.favorited.as(
										'hidden',
										`${!item.favorited}`,
									)}
								/>

								<button
									title={isFavorited ? 'Remove Favorite' : 'Mark as Favorite'}
									disabled={favTogglesLoading.has(item.id)}
									class="bg-surface p-1.5 {isFavorited
										? 'text-danger'
										: 'text-shimmer'} drop-shadow-sm drop-shadow-background disabled:brightness-100 border-border-strong"
									{...favHandler.buttonProps.enhance(async ({ submit }) => {
										favTogglesLoading.set(item.id, !item.favorited);
										await submit();
										setTimeout(() => {
											favTogglesLoading.delete(item.id);
										}, 500);
									})}
								>
									{#if isFavorited}
										<StarOffIcon size={20} />
									{:else}
										<StarIcon size={20} />
									{/if}
								</button>
							</form>
							{#if item.favorited}{/if}
						{/if}
					{/snippet}
				</WishlistItem>
			</div>
		{/each}
	{:else}
		<p class="w-full font-light italic">
			No items have been added to this list...
			<span class="font-bold text-danger">yet.</span>
		</p>
	{/if}
</div>

<style>
	.button {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
</style>
