<script lang="ts">
	import { browser } from '$app/environment';
	import type { WishlistItem } from '$lib/server/db/schema';
	import type { Snippet } from 'svelte';

	let {
		item,
		interactive = true,
		footer: toolbar,
	}: {
		item: Partial<Omit<WishlistItem, 'id' | 'wishlistId' | 'createdAt'>>;
		interactive?: boolean;
		footer?: Snippet<[item: typeof item]>;
	} = $props();

	const currFormats = $derived.by(() => {
		const currency = item.priceCurrency || 'USD';

		try {
			const short = new Intl.NumberFormat(navigator.languages, {
				style: 'currency',
				currency,
				currencyDisplay: 'narrowSymbol',
			});

			const long = new Intl.NumberFormat(navigator.languages, {
				style: 'currency',
				currency,
				currencyDisplay: 'name',
				maximumFractionDigits: 0,
				roundingMode: 'ceil',
			});

			return { short, long };
		} catch (err) {
			if (browser) console.warn(err, { item });
		}
	});

	const urlSummary = $derived.by(() => {
		if (!item.url) return;

		try {
			const url = new URL(item.url);
			return url.hostname.replace('www.', '');
		} catch (err) {
			console.warn(err);
		}
	});

	const renderBody = $derived(item.url || item.notes);

	const hasJs
</script>

<div class="item-wrapper">
	<svelte:element this={!browser && item.url && interactive ? 'a' : 'div'} class="item" href={item.url} target="_blank">
		<div class="item-header">
			{#if item.imageUrl}
				<div class="item-image-wrapper">
					<img class="item-image" src={item.imageUrl} alt="{item.name} Primary Image" />
				</div>
			{/if}

			<p class="item-name">
				{item.name}
			</p>

			{#if currFormats && item.price}
				<p title="Priced around {currFormats.long.format(item.price)}" class="item-price">
					<span class="item-price-prefix">~</span>
					{currFormats.short.format(item.price)}
				</p>
			{/if}
		</div>

		{#if renderBody}
			<hr class="divider" />

			<div class="item-body">
				{#if item.notes}
					<p class="item-notes">{item.notes.trim()}</p>
				{/if}

				{#if urlSummary}
					<p class="item-link" title={item.url}>🔗 {urlSummary}</p>
				{/if}
			</div>
		{/if}
	</svelte:element>

	{#if toolbar}
		<div class="toolbar">
			{@render toolbar(item)}
		</div>
	{/if}
</div>

<style>
	.item-wrapper {
		width: 100%;
		max-width: 600px;

		position: relative;

		display: flex;
		flex-direction: column;
	}

	.item {
		width: 100%;
		height: 100%;

		display: flex;
		flex-direction: column;
		padding: 1rem;

		border: 2px solid slategray;
		border-radius: 6px;

		background-color: #fafafa;

		box-shadow: 0 0 transparent;
		transition: box-shadow 200ms ease;
	}

	.item:hover {
		box-shadow: 1px 3px 3px gray;
	}

	.item-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		flex: 1;

		padding-bottom: 0;
	}

	.item-image-wrapper {
		aspect-ratio: 16/9;
		overflow: hidden;
	}

	.item-image {
		width: 100%;
		height: 100%;
		padding: 1rem;

		object-fit: contain;
	}

	.item-name {
		font-size: large;
		font-weight: bold;

		white-space: normal;
		overflow-wrap: break-word;
	}

	.item-price-prefix {
		font-weight: bold;
		color: red;
	}

	.item-price {
		text-shadow: 0 0 0 transparent;
		transition: text-shadow 300ms ease;
	}

	.item:hover .item-price {
		text-shadow: 0 0 5px hotpink;
	}

	.item .divider {
		width: 100%;
		height: 2px;

		border: none;
		background-color: gray;
	}

	.item-body {
		height: 100%;

		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.item-notes {
		white-space: pre-wrap;
		overflow-wrap: break-word;
		font-weight: 300;
	}

	.item-link {
		margin-top: auto;
		font-weight: bold;
	}
</style>
