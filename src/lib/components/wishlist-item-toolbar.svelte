<script lang="ts">
	import { deleteItem } from '$lib/remotes/item.remote';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { slide } from 'svelte/transition';
	import { Settings2 as EditIcon, Trash2 as TrashIcon } from '@lucide/svelte';

	let { wishlistSlug, itemId }: { wishlistSlug: string; itemId: string } = $props();

	const hasJs = useHasJs();
	const deleteForm = deleteItem.for(itemId);

	let confirmResolver = $state<((res: boolean) => void) | undefined>();
	const confirming = $derived(confirmResolver !== undefined);

	const confirmYes = () => confirmResolver && confirmResolver(true);
	const confirmNo = () => confirmResolver && confirmResolver(false);

	const startConfirm = () => {
		if (confirming) return;

		return new Promise<boolean>((res) => {
			confirmResolver = res;
		}).finally(() => {
			confirmResolver = undefined;
		});
	};

	const onConfirmKeydown = (ev: KeyboardEvent) => {
		if (ev.key === 'Escape') confirmNo();
	};
</script>

<div class="h-12 max-h-12 px-2 py-3">
	{#if confirmResolver}
		<div
			class="flex h-full items-center gap-2"
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
			in:slide={{ duration: 150 }}
			out:slide={{ duration: 150 }}
			onkeydown={onConfirmKeydown}
		>
			<p class="w-full">Are you sure?</p>

			<button
				class="bg-transparent focus:ring-2"
				type="button"
				title="Yes"
				onclick={confirmYes}
			>
				Yes
			</button>

			<button
				class="bg-transparent focus:ring-2"
				type="button"
				title="No"
				onclick={confirmNo}
			>
				No
			</button>
		</div>
	{:else}
		<div
			class="flex flex-row-reverse gap-4"
			in:slide={{ duration: 150 }}
			out:slide={{ duration: 150 }}
		>
			<a
				title="Edit"
				class="button border-none bg-transparent p-0.5 focus:ring-2"
				href="/lists/{wishlistSlug}/item/{itemId}/edit"
			>
				<EditIcon />
			</a>

			<form class="text-danger" {...deleteForm}>
				<input {...deleteForm.fields.wishlistSlug.as('hidden', wishlistSlug)} />
				<input {...deleteForm.fields.itemId.as('hidden', itemId)} />
				<input {...deleteForm.fields.confirm.as('hidden', `${hasJs()}`)} />

				<button
					title="Delete"
					class="border-none bg-transparent p-0.5 focus:ring-2"
					disabled={confirming}
					{...deleteForm.buttonProps.enhance(async ({ submit }) => {
						const res = await startConfirm();
						if (res === true) {
							deleteForm.fields.confirm.set(true);
							await submit();
						}
					})}
				>
					<TrashIcon />
				</button>
			</form>
		</div>
	{/if}
</div>
