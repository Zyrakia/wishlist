<script lang="ts">
	import type { SearchResult } from '$lib/schemas/search';
	import { UrlBuilder } from '$lib/util/url';
	import { BookmarkCheckIcon, CircleUserRoundIcon, GiftIcon, UsersIcon } from '@lucide/svelte';

	let { result }: { result: SearchResult } = $props();

	const subtitle = $derived.by(() => {
		if (result.kind === 'list') return result.entity.description;
		if (result.kind === 'reservation') return result.entity.notes;
		return undefined;
	});

	const href = $derived.by((): string => {
		const builder = UrlBuilder.from();

		switch (result.kind) {
			case 'list':
				builder.segment('list').segment(result.entity.slug);
				break;
			case 'reservation':
				// TODO need to implement focusItem
				builder
					.segment(`lists`)
					.segment(result.entity.wishlistSlug)
					.param('focusItem', result.entity.itemId);
				break;
			case 'mutual':
				// TODO need to implement user page
				builder.segment('users').segment(result.entity.userId);
				break;
			case 'group':
				builder.segment('groups').segment(result.entity.id);
				break;
		}

		return builder.toPath();
	});
</script>

<a
	class="flex min-w-0 items-start gap-3 rounded-lg border border-border-strong/70 bg-surface/65 px-3 py-2.5"
	{href}
>
	<span class="mt-0.5 shrink-0">
		{#if result.kind === 'mutual'}
			<CircleUserRoundIcon class="text-danger" size={18} />
		{:else if result.kind === 'list'}
			<GiftIcon class="text-accent" size={18} />
		{:else if result.kind === 'reservation'}
			<BookmarkCheckIcon class="text-success" size={18} />
		{:else if result.kind === 'group'}
			<UsersIcon class="text-danger" size={18} />
		{/if}
	</span>

	<span class="flex min-w-0 flex-1 flex-col">
		<span class="w-full max-w-full flex-1 text-sm font-semibold text-text">
			<span class="truncate">{result.entity.name}</span>
			{#if result.kind === 'reservation'}
				<span class="truncate text-xs text-accent">
					({result.entity.ownerName})
				</span>
			{/if}
		</span>

		{#if subtitle}
			<p class="truncate text-xs text-text-muted">{subtitle}</p>
		{/if}
	</span>
</a>
