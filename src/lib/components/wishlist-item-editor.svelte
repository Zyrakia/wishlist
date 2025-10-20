<script lang="ts">
	import { createItem, updateItem } from '$lib/remotes/item.remote';
	import { ItemSchema } from '$lib/schema/item';
	import WishlistItem from './wishlist-item.svelte';
	import type { WishlistItem as _WishlistItemType } from '$lib/server/db/schema';
	import type z from 'zod';
	import { fade } from 'svelte/transition';
	import type { RemoteFormField, RemoteFormFieldValue } from '@sveltejs/kit';
	import type { FormEventHandler } from 'svelte/elements';
	import { onMount } from 'svelte';

	type ItemType = Omit<_WishlistItemType, 'id' | 'wishlistId' | 'createdAt'>;

	let { item: initProperties = {} }: { item?: Partial<ItemType> } = $props();

	const isCreate = $derived(Object.keys(initProperties).length === 0);
	const remote = $derived(isCreate ? createItem : updateItem);

	let item = $state<Partial<z.infer<typeof ItemSchema>>>({});
	const placeholder: ItemType = {
		name: 'New Item',
		notes: 'Explain specifics or motivations about this item.',
		price: 19.99,
		priceCurrency: 'USD',
		imageUrl: null,
		url: 'https://example.com',
	};

	const hasIssue = $derived(remote.fields.issues() !== undefined);
	const preview = $derived({ ...placeholder, ...item });

	let hasJs = $state(false);
	$effect(() => void (hasJs = true));
	1;

	onMount(() => {
		const { success, data } = ItemSchema.safeParse(initProperties);
		if (!success) return;

		remote.fields.set(data as any);
		item = data;
	});

	let container: HTMLDivElement;
	onMount(() => {
		const target = document.scrollingElement || document.documentElement;

		const update = () => {
			const hasScroll = target.scrollHeight > target.clientHeight + 1;
			container.classList.toggle('scroll-possible', hasScroll);
		};

		const ro = new ResizeObserver(update);
		ro.observe(target);

		window.addEventListener('resize', update);
		update();

		return () => ro.disconnect();
	});

	const onInput: FormEventHandler<HTMLFormElement> = (ev) => {
		const input = ev.target;
		if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) return;

		const key = input.name;
		if (!(key in ItemSchema.shape)) return;

		const fieldName = key as keyof z.infer<typeof ItemSchema>;
		const schema = ItemSchema.shape[fieldName];
		const value = input.value;

		const res = schema.safeParse(value);
		if (res.success) {
			if (res.data === undefined) delete item[fieldName];
			else (item[fieldName] as any) = res.data;
		}

		remote.validate();
	};

	const issue = (field: RemoteFormField<RemoteFormFieldValue>) => field.issues()?.[0]?.message;
</script>

<div bind:this={container} class="container">
	{#if hasJs && preview}
		<aside class="preview-pane">
			<div class="preview-snap">
				<WishlistItem item={preview} interactive={false} />
			</div>
		</aside>

		<div class="divider"></div>
	{/if}

	<section class="form-pane">
		<form {...remote.preflight(ItemSchema)} oninput={onInput}>
			<label class="input-group required">
				Name

				<input placeholder={placeholder.name} required {...remote.fields.name.as('text')} />

				{#if issue(remote.fields.name)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.name)}
					</p>
				{/if}
			</label>

			<label class="input-group">
				Notes

				<textarea rows="6" placeholder={placeholder.notes} {...remote.fields.notes.as('text')}
				></textarea>

				{#if issue(remote.fields.notes)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.notes)}
					</p>
				{/if}
			</label>

			<label class="input-group">
				Price

				<input
					placeholder={placeholder.price?.toFixed(2)}
					{...remote.fields.price.as('text')}
					step="0.01"
					min="0"
				/>

				{#if issue(remote.fields.price)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.price)}
					</p>
				{/if}
			</label>

			<label class="input-group">
				Purchase Link

				<input placeholder={placeholder.url} {...remote.fields.url.as('url')} />

				{#if issue(remote.fields.url)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.url)}
					</p>
				{/if}
			</label>

			<label class="input-group">
				Image Link

				<input placeholder={placeholder.imageUrl} {...remote.fields.imageUrl.as('url')} />

				{#if issue(remote.fields.imageUrl)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.imageUrl)}
					</p>
				{/if}
			</label>

			<button type="submit" disabled={hasJs && hasIssue}>Submit</button>
		</form>
	</section>
</div>

<style>
	.container {
		height: 100%;

		display: grid;
		grid-template-columns: 1fr 1px 1.5fr;
	}

	.preview-pane {
		padding: 2rem;

		background-color: whitesmoke;

		display: grid;
		place-items: center;
	}

	.container.scroll-possible .preview-pane {
		display: initial;
	}

	.container.scroll-possible .preview-snap {
		position: sticky;
		top: 2rem;
	}

	.divider {
		background: black;
		box-shadow: -4px 0 5px rgba(0, 0, 0, 0.5);
	}

	.form-pane {
		width: 100%;
		padding: 1.5rem;

		overflow: auto;
	}

	@media (max-width: 1000px) {
		.container {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1px auto;
		}

		.divider {
			box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.5);
		}
	}

	form {
		display: flex;
		flex-direction: column;
		justify-content: center;

		gap: 1.5rem;
	}

	.input-group {
		width: 100%;
		position: relative;

		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	input,
	textarea {
		outline: none;
		border: 1px solid black;

		padding: 0.5rem;
		border-radius: 6px;
	}

	input:focus,
	textarea:focus {
		border-color: blue;
	}

	input[aria-invalid],
	textarea[aria-invalid] {
		border-color: red;
	}

	textarea {
		resize: vertical;
	}

	button {
		padding: 0.5rem;
		outline: none;
	}

	.required {
		position: relative;
	}

	.required::before {
		content: '*';
		position: absolute;
		right: calc(100% + 0.2em);
		color: red;
	}

	.error {
		position: absolute;
		top: 0;
		right: 0;

		padding-right: 0.5rem;
		border-right: 1px dashed red;

		font-weight: bold;
		font-size: small;
		color: crimson;
	}

	.price-section {
		display: flex;
		gap: 1rem;
	}
</style>
