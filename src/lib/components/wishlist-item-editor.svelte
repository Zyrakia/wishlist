<script lang="ts">
	import { createItem, updateItem } from '$lib/remotes/item.remote';
	import { ItemSchema } from '$lib/schema/item';
	import type { WishlistItem as _WishlistItemType } from '$lib/server/db/schema';
	import type z from 'zod';
	import WishlistItem from './wishlist-item.svelte';
	import { fade } from 'svelte/transition';

	type ItemType = Omit<_WishlistItemType, 'id' | 'wishlistId' | 'createdAt'>;

	let { item: initProperties = {} }: { item?: Partial<ItemType> } = $props();

	const isCreateMode = $derived(Object.keys(initProperties).length === 0);
	const remote = $derived(isCreateMode ? createItem : updateItem);

	let setProperties = $state<z.infer<typeof ItemSchema> | undefined>();

	const DEFAULT_PROPERTIES: ItemType = {
		name: 'New Item',
		notes: 'Explain specifics or motivations about this item.',
		price: 19.99,
		priceCurrency: 'USD',
		imageUrl: null,
		url: 'https://example.com',
	};

	const preview = $derived({ ...DEFAULT_PROPERTIES, ...(setProperties || {}) });

	const onInput = () => {
		const res = ItemSchema.safeParse(remote.fields.value());
		if (res.success) setProperties = res.data;

		remote.validate();
	};
</script>

<div class="container">
	{#if preview}
		<WishlistItem item={preview} interactive={false} />
	{/if}

	<form {...remote.preflight(ItemSchema)} oninput={onInput}>
		<label class="input-group">
			Name

			<input required {...remote.fields.name.as('text')} />

			{#each remote.fields.name.issues() as issue}
				<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">{issue.message}</p>
			{/each}
		</label>

		<label class="input-group">
			Notes

			<textarea {...remote.fields.notes.as('text')}></textarea>

			{#each remote.fields.notes.issues() as issue}
				<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">{issue.message}</p>
			{/each}
		</label>

		<div class="price-section">
			<label class="input-group">
				Price

				<input style="width: 100%;" {...remote.fields.price.as('text')} step="0.01" min="0" />

				{#each remote.fields.price.issues() as issue}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue.message}
					</p>
				{/each}
			</label>

			<label class="input-group">
				Currency

				<input {...remote.fields.priceCurrency.as('select')} />

				{#each remote.fields.priceCurrency.issues() as issue}
					<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">
						{issue.message}
					</p>
				{/each}
			</label>
		</div>

		<label class="input-group">
			Purchase Link

			<input {...remote.fields.url.as('url')} />

			{#each remote.fields.url.issues() as issue}
				<p in:fade={{ duration: 150 }} out:fade={{ duration: 150 }} class="error">{issue.message}</p>
			{/each}
		</label>

		<button>Submit</button>
	</form>
</div>

<style>
	.container {
		width: 100%;
		height: 100%;

		padding: 1rem;

		display: flex;
		flex-wrap: wrap;
		align-items: center;
	}

	form {
		width: 100%;

		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.input-group {
		width: 100%;
		position: relative;

		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.error {
		position: absolute;
		top: 110%;

		padding-left: 0.5rem;
		border-left: 1px dashed red;

		font-weight: 300;
		font-size: small;
		color: crimson;
	}

	.price-section {
		display: flex;
		gap: 1rem;
	}
</style>
