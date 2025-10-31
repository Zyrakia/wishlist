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

<div class="w-full max-w-xl relative flex flex-col">
	<svelte:element
		this={!hasJs() && canClick ? 'a' : 'button'}
		onclick={() => {
			if (!canClick) return;
			window.open(item.url!, '_blank', 'noopener,noreferrer');
		}}
		disabled={!canClick}
		role="link"
		tabindex="0"
		class={[
			'button w-full h-full flex flex-col justify-center p-4 border-2 bg-white brightness-100 border-zinc-300 shadow-sm text-left transition-shadow',
			canClick && 'interactive cursor-pointer hover:shadow-xl',
		]}
		href={item.url}
		target="_blank"
	>
		<div class="flex flex-col justify-center gap-2 flex-1">
			{#if item.imageUrl}
				<div class="aspect-video flex justify-center overflow-hidden p-2">
					<img
						class="object-contain w-full"
						src={item.imageUrl}
						alt="{item.name} Primary Image"
					/>
				</div>
			{/if}

			<p class="text-lg font-bold whitespace-normal wrap-break-word">
				{item.name}
			</p>
		</div>

		{#if renderBody}
			<div class="h-full text-left">
				<hr class="border-zinc-400" />

				{#if item.notes}
					<p class="whitespace-pre-wrap wrap-break-word font-light mt-2 text-base">
						{item.notes.trim()}
					</p>
				{/if}
			</div>

			<div class="pt-2 flex gap-1">
				{#if currFormats && item.price}
					<p
						title="Priced around {currFormats.long.format(item.price)}"
						class="item-price"
					>
						<span class="font-bold text-red-500">~</span>
						{currFormats.short.format(item.price)}
					</p>
				{/if}

				{#if urlSummary}
					<span>
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
	.item-price {
		text-shadow: 0 0 0 transparent;
		transition: text-shadow 300ms ease;
		flex: 0 0 auto;

		font-weight: bold;
	}

	.interactive:hover .item-price {
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

	.interactive:hover .item-link-name::before {
		width: 100%;
	}
</style>
