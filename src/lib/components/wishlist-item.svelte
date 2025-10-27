<script lang="ts">
	import { browser } from '$app/environment';
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import type { Item } from '$lib/schemas/item';
	import type { Snippet } from 'svelte';

	let {
		item,
		interactive = true,
		footer,
	}: {
		item: Partial<Item>;
		interactive?: boolean;
		footer?: Snippet<[]>;
	} = $props();

	const canClick = $derived(interactive && item.url);

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

	const renderBody = $derived(item.price || item.url || item.notes);

	const hasJs = useHasJs();
</script>

<div class="item-wrapper">
	<svelte:element
		this={!hasJs() && canClick ? 'a' : 'button'}
		onclick={() => {
			if (!canClick) return;
			window.open(item.url!, '_blank', 'noopener,noreferrer');
		}}
		disabled={!canClick}
		role="link"
		tabindex="0"
		class={['item', canClick && 'interactive']}
		href={item.url}
		target="_blank"
	>
		<div class="item-header">
			{#if item.imageUrl}
				<div class="item-image-wrapper">
					<img class="item-image" src={item.imageUrl} alt="{item.name} Primary Image" />
				</div>
			{/if}

			<p class="item-name">
				{item.name}
			</p>
		</div>

		{#if renderBody}
			<div class="item-body">
				<hr class="divider" />

				{#if item.notes}
					<p class="item-notes">{item.notes.trim()}</p>
				{/if}
			</div>

			<div class="item-purchase-details">
				{#if currFormats && item.price}
					<p
						title="Priced around {currFormats.long.format(item.price)}"
						class="item-price"
					>
						<span class="item-price-prefix">~</span>
						{currFormats.short.format(item.price)}
					</p>
				{/if}

				{#if urlSummary}
					<span class="item-link-prefix">
						{currFormats && item.price ? 'at' : '🔗'}
					</span>
					<span class="item-link-name" title={item.url}>{urlSummary}</span>
				{/if}
			</div>
		{/if}
	</svelte:element>

	{#if footer}
		{@render footer()}
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
		justify-content: center;
		padding: 1rem;

		border: 2px solid #ccc;
		border-radius: 6px;

		background-color: white;

		box-shadow: 0 0 transparent;
		transition: box-shadow 200ms ease;

		text-align: left;

		filter: brightness(1);
	}

	.item.interactive {
		cursor: pointer;
	}

	.item.interactive:hover {
		box-shadow: -3px 2px 5px rgba(0, 0, 0, 0.4);
	}

	.item-header {
		display: flex;
		flex-direction: column;
		justify-content: center;

		text-align: center;

		gap: 0.5rem;

		flex: 1 1;

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

	.divider {
		width: 100%;
		height: 1px;

		border: none;
		background-color: gray;
	}

	.item-body {
		height: 100%;
		text-align: left;
	}

	.item-purchase-details {
		padding-top: 0.5rem;
		display: flex;
		gap: 0.25rem;
	}

	.item-notes {
		white-space: pre-wrap;
		overflow-wrap: break-word;
		font-weight: 300;
	}

	.item-price {
		text-shadow: 0 0 0 transparent;
		transition: text-shadow 300ms ease;
		flex: 0 0 auto;

		font-weight: bold;
	}

	.item-price-prefix {
		font-weight: bold;
		color: red;
	}

	.item.interactive:hover .item-price {
		text-shadow: 0 0 5px hotpink;
	}

	.item-link-name {
		position: relative;

		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-link-name::before {
		content: '';

		position: absolute;
		bottom: 0;
		left: 0;

		height: 1px;
		width: 0;

		background-color: black;
		opacity: 0.5;

		transition: width 150ms ease-in;
	}

	.item.interactive:hover .item-link-name::before {
		width: 100%;
	}
</style>
