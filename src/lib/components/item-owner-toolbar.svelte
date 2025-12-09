<script lang="ts">
	import { deleteItem, setItemFavorited } from '$lib/remotes/item.remote';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import type { WishlistConnection } from '$lib/schemas/connection';
	import {
		ExternalLinkIcon,
		Settings2Icon,
		StarIcon,
		StarOffIcon,
		Trash2Icon,
	} from '@lucide/svelte';
	import { slide } from 'svelte/transition';

	let {
		itemId,
		wishlistSlug,
		favorited,
		connection,
	}: {
		itemId: string;
		wishlistSlug: string;
		favorited: boolean;
		connection?: WishlistConnection;
	} = $props();

	const hasJs = useHasJs();

	const favHandler = setItemFavorited.for(itemId);
	const delHandler = deleteItem.for(itemId);

	let deleteConfirmPromise: Promise<boolean> | undefined = $state();
	let deleteConfirmResolver: ((res: boolean) => void) | undefined = $state();
	const deleteConfirm = () => {
		if (deleteConfirmPromise) return deleteConfirmPromise;

		deleteConfirmPromise = new Promise<boolean>((res) => {
			deleteConfirmResolver = res;
		}).finally(() => {
			deleteConfirmResolver = undefined;
			deleteConfirmPromise = undefined;
		});

		return deleteConfirmPromise;
	};

	const resolveDelete = (confirmed: boolean) => {
		if (!deleteConfirmResolver) return;
		deleteConfirmResolver(confirmed);
	};

	const resolveDeleteByKey = (ev: KeyboardEvent) => {
		if (ev.key === 'Escape') resolveDelete(false);
	};

	const isConfirmingDelete = $derived(!!deleteConfirmPromise && !!deleteConfirmResolver);
</script>

<div
	class="mt-2.5 max-h-10 min-h-10 px-1"
	in:slide={{ duration: 100 }}
	out:slide={{ duration: 100 }}
>
	{#if isConfirmingDelete}
		<div
			class="flex h-full items-center gap-2"
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
			in:slide={{ duration: 150 }}
			out:slide={{ duration: 150 }}
			onkeydown={resolveDeleteByKey}
		>
			<p class="w-full">Are you sure?</p>

			<button
				class="bg-transparent focus:ring-2"
				type="button"
				title="Yes"
				onclick={() => resolveDelete(true)}
			>
				Yes
			</button>

			<button
				class="bg-transparent focus:ring-2"
				type="button"
				title="No"
				onclick={() => resolveDelete(false)}
			>
				No
			</button>
		</div>
	{:else}
		<div
			class="flex items-center gap-2"
			in:slide={{ duration: 150 }}
			out:slide={{ duration: 150 }}
		>
			<form {...favHandler} class="me-auto">
				<input {...favHandler.fields.itemId.as('hidden', itemId)} />
				<input {...favHandler.fields.favorited.as('hidden', `${!favorited}`)} />

				<button
					{...favHandler.buttonProps}
					title={favorited ? 'Remove Favorite' : 'Mark as Favorite'}
					disabled={!!favHandler.pending}
					class="bg-surface p-1.5 {favorited
						? 'text-danger'
						: 'text-shimmer'} border-border-strong drop-shadow-sm drop-shadow-background disabled:brightness-100"
				>
					{#if favorited}
						<StarOffIcon size={20} />
					{:else}
						<StarIcon size={20} />
					{/if}
				</button>
			</form>

			{#if !connection}
				<a
					class="button flex items-center justify-center border-border-strong bg-surface p-1.5 drop-shadow-sm drop-shadow-background"
					href="/lists/{wishlistSlug}/item/{itemId}/edit"
				>
					<Settings2Icon size={20} />
				</a>

				<form {...delHandler}>
					<input {...delHandler.fields.itemId.as('hidden', itemId)} />
					<input {...delHandler.fields.wishlistSlug.as('hidden', wishlistSlug)} />
					<input {...delHandler.fields.confirm.as('hidden', `${hasJs()}`)} />

					<button
						title="Delete Item"
						class="flex items-center justify-center border-border-strong bg-surface p-1.5 drop-shadow-sm drop-shadow-background"
						{...delHandler.buttonProps.enhance(async ({ submit }) => {
							const res = await deleteConfirm();
							if (!res) return;

							delHandler.fields.confirm.set(true);
							await submit();
						})}
					>
						<Trash2Icon class="text-danger" size={20} />
					</button>
				</form>
			{:else if connection}
				<p class="flex max-w-1/2 items-center justify-end gap-2 text-text-muted">
					<a class="truncate text-accent hover:underline" href={connection.url}>
						{connection.name}
					</a>

					<ExternalLinkIcon class="shrink-0" size={18} />
				</p>
			{/if}
		</div>
	{/if}
</div>
