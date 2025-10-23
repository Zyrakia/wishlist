<script lang="ts">
	import { deleteItem } from '$lib/remotes/item.remote';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { slide } from 'svelte/transition';
	import {
		Settings as SettingsIcon,
		Trash2 as TrashIcon,
		Check as CheckIcon,
		X as XIcon,
	} from '@lucide/svelte';

	let { wishlistSlug, itemId }: { wishlistSlug: string; itemId: string } = $props();

	const hasJs = useHasJs();
	const deleteForm = deleteItem.for(itemId);

	let confirmResolver = $state<((res: boolean) => void) | undefined>();
	const confirming = $derived(confirmResolver !== undefined);

	let yesBtn = $state<HTMLButtonElement | null>(null);

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

	$effect(() => {
		if (confirming && yesBtn) yesBtn.focus();
	});
</script>

<div class="container">
	<a title="Edit" class="button" href="/{wishlistSlug}/item/{itemId}/edit"><SettingsIcon /></a>

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
					console.log('Submitting');
					await submit();
				}
			})}><TrashIcon /></button
		>
	</form>

	{#if confirmResolver}
		<div
			class="confirm"
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
			in:slide={{ duration: 150 }}
			out:slide={{ duration: 150 }}
			onkeydown={onConfirmKeydown}
		>
			<p>Are you sure?</p>

			<button bind:this={yesBtn} type="button" title="Yes" onclick={confirmYes}
				><CheckIcon color="green" /></button
			>

			<button type="button" title="No" onclick={confirmNo}><XIcon /></button>
		</div>
	{/if}
</div>

<style>
	.container {
		position: relative;
		padding: 0.5rem;

		display: flex;
		gap: 1rem;

		transition: scale 100ms ease;
	}

	button,
	.button {
		padding: 0;
		background: none;
		outline: none;
		border: none;
		cursor: pointer;
	}

	button:hover,
	.button:hover {
		transform: scale(1.05);
	}

	button:active,
	.button:active {
		transform: scale(1);
	}

	button:focus,
	.button:focus {
		border: 1px solid black;
		border-radius: 5px;
	}

	.delete-form {
		color: red;
		margin-left: auto;
	}

	.confirm {
		position: absolute;
		left: 0;
		right: 0;
		height: 100%;

		background-color: white;
		border-radius: 8px;

		padding: 0.5rem;

		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.confirm p {
		margin-right: auto;
	}
</style>
