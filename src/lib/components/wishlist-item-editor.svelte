<script lang="ts">
	import { createItem, updateItem } from '$lib/remotes/item.remote';
	import { ItemSchema } from '$lib/schemas/item';
	import WishlistItem from './wishlist-item.svelte';
	import type { WishlistItem as _WishlistItemType } from '$lib/server/db/schema';
	import type z from 'zod';
	import { fade } from 'svelte/transition';
	import type { RemoteFormField, RemoteFormFieldValue } from '@sveltejs/kit';
	import type { FormEventHandler } from 'svelte/elements';
	import { onMount } from 'svelte';
	import { safePrune } from '$lib/util/safe-prune';
	import { useHasJs } from '$lib/runes/has-js.svelte';

	type ItemType = Omit<_WishlistItemType, 'id' | 'wishlistId' | 'createdAt'>;

	let {
		item: initProperties = {},
		mode = 'create',
	}: { item?: Partial<ItemType>; mode?: 'edit' | 'create' } = $props();

	let item = $state<Partial<z.infer<typeof ItemSchema>>>({});
	const placeholder: ItemType = {
		name: 'New Item',
		notes: '',
		price: 19.99,
		priceCurrency: 'USD',
		imageUrl: 'https://picsum.photos/1280/720',
		url: 'https://example.com',
	};

	const isCreate = mode === 'create';
	const remote = isCreate ? createItem : updateItem;

	const hasIssue = $derived(remote.fields.issues() !== undefined);
	const preview = $derived({ ...(isCreate ? placeholder : {}), ...item });

	const hasJs = useHasJs();

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

	const seedItem = safePrune(ItemSchema, initProperties);
	if (Object.keys(seedItem).length !== 0) {
		remote.fields.set(seedItem as any);
		item = seedItem;
	}
</script>

<div
	bind:this={container}
	class="container"
	style="grid-template-columns: {hasJs() && preview ? '1fr 1px 1.5fr' : '100% !important'}"
>
	{#if hasJs() && preview}
		<aside class="preview-pane">
			<div class="preview-snap">
				<h3 class="preview-label">Preview</h3>
				<WishlistItem item={preview} interactive={false} />
			</div>
		</aside>

		<div class="divider"></div>
	{/if}

	<section class="form-pane">
		<form {...remote.preflight(ItemSchema)} oninput={onInput}>
			<label class="input-group required">
				<span class="input-group-label">Name</span>

				<input placeholder={placeholder.name} required {...remote.fields.name.as('text')} />

				{#if issue(remote.fields.name)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.name)}
					</p>
				{/if}
			</label>

			<label class="input-group">
				<span class="input-group-label">Notes</span>

				<textarea rows="6" placeholder={placeholder.notes} {...remote.fields.notes.as('text')}
				></textarea>

				{#if issue(remote.fields.notes)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.notes)}
					</p>
				{/if}
			</label>

			<div class="price-group">
				<label class="input-group price-value-group">
					<span class="input-group-label">Price</span>

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

				<label class="input-group currency-group">
					<span class="input-group-label">Currency</span>

					<input
						placeholder={placeholder.priceCurrency}
						{...remote.fields.priceCurrency.as('text')}
						list="currency-list"
						autocomplete="off"
					/>

					{#if issue(remote.fields.priceCurrency)}
						<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
							{issue(remote.fields.priceCurrency)}
						</p>
					{/if}

					<datalist id="currency-list">
						<option value="USD">USD ($)</option>
						<option value="EUR">EUR (€)</option>
						<option value="GBP">GBP (£)</option>
						<option value="JPY">JPY (¥)</option>
						<option value="AUD">AUD ($)</option>
						<option value="CAD">CAD ($)</option>
						<option value="CNY">CNY (¥)</option>
						<option value="INR">INR (₹)</option>
						<option value="MXN">MXN ($)</option>
					</datalist>
				</label>
			</div>

			<label class="input-group">
				<span class="input-group-label">Purchase Link</span>

				<input placeholder={placeholder.url} {...remote.fields.url.as('text')} />

				{#if issue(remote.fields.url)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.url)}
					</p>
				{/if}
			</label>

			<label class="input-group">
				<span class="input-group-label">Image Link</span>

				<input placeholder={placeholder.imageUrl} {...remote.fields.imageUrl.as('text')} />

				{#if issue(remote.fields.imageUrl)}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue(remote.fields.imageUrl)}
					</p>
				{/if}
			</label>

			<button disabled={hasIssue && hasJs()} {...remote.buttonProps}
				>{mode === 'edit' ? 'Save' : 'Submit'}</button
			>
		</form>
	</section>
</div>

<style>
	.container {
		height: 100%;

		display: grid;
	}

	.preview-pane {
		padding: 2rem;

		background-color: rgb(233, 233, 233);

		display: grid;
		place-items: center;
	}

	.container.scroll-possible .preview-pane {
		display: initial;
	}

	.preview-snap {
		width: 100%;
		max-width: 600px;

		position: relative;

		padding: 1rem;
		border: 1px solid rgba(255, 0, 0, 0.3);
		border-radius: 12px;

		background-color: white;
		box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.3);
	}

	.preview-label {
		padding-bottom: 1rem;
		margin-bottom: 1rem;
		border-bottom: 1px dashed rgba(255, 0, 0, 0.3);
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
			grid-template-columns: 100% !important;
			grid-template-rows: auto 1px auto !important;
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

	.input-group-label {
		font-weight: 700;
	}

	.price-group {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.price-value-group {
		flex: 2 1 0;
		min-width: 250px;
	}

	.currency-group {
		flex: 1 0 250px;
		min-width: 250px;
		max-width: 300px;
	}

	@media (max-width: 600px) {
		.currency-group {
			max-width: 100%;
		}
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
		border: 1px solid black;
		border-radius: 6px;

		background-color: #bbf451;

		transition: filter 100ms ease;
	}

	button:not(:disabled):hover {
		filter: brightness(0.95);
	}

	button:disabled {
		filter: brightness(0.75);
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
