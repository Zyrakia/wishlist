<script lang="ts">
	import { deleteItem } from '$lib/remotes/item.remote';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { slide } from 'svelte/transition';
	import { Settings as EditIcon, Trash2 as TrashIcon } from '@lucide/svelte';

	let { wishlistSlug, itemId }: { wishlistSlug: string; itemId: string } = $props();

	const hasJs = useHasJs();
	const deleteForm = deleteItem.for(itemId);

	let confirmResolver = $state<((res: boolean) => void) | undefined>();
	const confirming = $derived(confirmResolver !== undefined);

	const confirmYes = () => confirmResolver && confirmResolver(true);
	const confirmNo = () => confirmResolver && confirmResolver(false);

	let lastFocused: HTMLElement | null = null;
	const startConfirm = () => {
		if (confirming) return;

		lastFocused = document.activeElement as HTMLElement | null;

		return new Promise<boolean>((res) => {
			confirmResolver = res;
		}).finally(() => {
			confirmResolver = undefined;
			lastFocused?.focus?.();
			lastFocused = null;
		});
	};

	const onConfirmKeydown = (ev: KeyboardEvent) => {
		if (ev.key === 'Escape') confirmNo();
	};
</script>

<div class="container">
	{#if confirmResolver}
		<div
			class="confirm-container"
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
			in:slide={{ duration: 150 }}
			out:slide={{ duration: 150 }}
			onkeydown={onConfirmKeydown}
		>
			<p>Are you sure?</p>

			<button type="button" title="Yes" onclick={confirmYes} class="button">Yes</button>
			<button type="button" title="No" onclick={confirmNo} class="button">No</button>
		</div>
	{:else}
		<div class="actions-container" in:slide={{ duration: 150 }} out:slide={{ duration: 150 }}>
			<a title="Edit" class="button" href="/{wishlistSlug}/item/{itemId}/edit"><EditIcon /></a>

			<form class="delete-form" {...deleteForm}>
				<input {...deleteForm.fields.wishlistSlug.as('hidden', wishlistSlug)} />
				<input {...deleteForm.fields.itemId.as('hidden', itemId)} />
				<input {...deleteForm.fields.confirm.as('hidden', `${hasJs()}`)} />

				<button
					title="Delete"
					class="button"
					disabled={confirming}
					{...deleteForm.buttonProps.enhance(async ({ submit }) => {
						const res = await startConfirm();
						if (res === true) {
							deleteForm.fields.confirm.set(true);
							await submit();
						}
					})}><TrashIcon /></button
				>
			</form>
		</div>
	{/if}
</div>

<style>
	.container {
		max-height: 48px;
		min-height: 48px;
		padding: 0.5rem;
		transition: scale 100ms ease;
	}

	.actions-container {
		display: flex;
		flex-direction: row-reverse;
		gap: 0.5rem;
	}

	.button {
		background: none;
		border: none;
	}

	.delete-form {
		color: red;
	}

	.confirm-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.confirm-container p {
		margin-right: auto;
	}
</style>
