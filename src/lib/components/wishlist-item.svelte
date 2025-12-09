<script lang="ts">
	import { browser } from '$app/environment';
	import type { Item } from '$lib/schemas/item';
	import type { Snippet } from 'svelte';

	let {
		item,
		interactive = true,
		highlighted = false,
		footer,
	}: {
		item: Partial<Item>;
		interactive?: boolean;
		highlighted?: boolean;
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
			const [, ...hostParts] = new URL(item.url).hostname.split('.');
			return hostParts.join('.');
		} catch (err) {
			console.warn(err);
		}
	});

	const renderBody = $derived(item.price || item.url || item.notes);
</script>

<div class="relative flex h-full w-full max-w-full flex-col">
	<svelte:element
		this={canClick ? 'a' : 'div'}
		role="link"
		tabindex="0"
		class={[
			'button flex h-full w-full flex-col justify-center rounded-xl border border-border-strong from-muted to-surface p-0 text-left shadow-sm shadow-accent/10 brightness-100 transition-all dark:bg-radial-[at_50%_25%]',

			canClick && 'interactive cursor-pointer hover:border-accent hover:shadow-xl',
			highlighted && 'ring-2 ring-accent/75 drop-shadow-[0_0_6px_white] drop-shadow-accent',
		]}
		href={item.url}
		target="_blank"
	>
		{#if item.imageUrl}
			<div
				class="flex aspect-video justify-center overflow-hidden rounded-xl rounded-br-none rounded-bl-none p-4"
			>
				<img
					class="w-full object-contain"
					src={item.imageUrl}
					alt="{item.name} Primary Image"
				/>
			</div>
		{/if}

		<p class="flex-1 p-4 py-2 text-lg font-bold wrap-break-word whitespace-normal">
			{item.name}
		</p>

		{#if renderBody}
			{#if item.notes}
				<p
					class="px-4 pb-2 text-left text-base font-light wrap-break-word whitespace-pre-wrap"
				>
					{item.notes.trim()}
				</p>
			{/if}

			<hr class=" w-full border-border" />

			<div class="flex items-center gap-2 px-4 py-3">
				{#if currFormats && item.price}
					<p
						title="Priced around {currFormats.long.format(item.price)}"
						class="item-price"
					>
						<span class="font-bold text-danger">~</span>
						<span class="text-base font-extrabold text-accent">
							{currFormats.short.format(item.price)}
						</span>
					</p>
				{/if}

				{#if urlSummary}
					<p>
						<span>
							{currFormats && item.price ? 'at' : '🔗'}
						</span>
						<span class="item-link-name" title={item.url}>{urlSummary}</span>
					</p>
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
	}

	.interactive:hover .item-price {
		text-shadow: 0 0 15px var(--color-accent);
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

		height: 2px;
		width: 0;

		background-color: var(--color-accent);
		opacity: 0.5;

		transition: width 150ms ease-in;
	}

	.interactive:hover .item-link-name::before {
		width: 101%;
	}
</style>
