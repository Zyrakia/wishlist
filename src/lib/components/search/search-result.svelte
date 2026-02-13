<script lang="ts">
	import type { SearchResult } from '$lib/schemas/search';
	import { UrlBuilder } from '$lib/util/url';
	import {
		BookmarkCheckIcon,
		CircleUserRoundIcon,
		ScrollTextIcon,
		UsersIcon,
	} from '@lucide/svelte';

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
				builder
					.segment(`lists`)
					.segment(result.entity.wishlistSlug)
					.param('focusItem', result.entity.itemId);
				break;
			case 'mutual':
				builder.segment('users').segment(result.entity.userId);
				break;
			case 'group':
				builder.segment('groups').segment(result.entity.groupId);
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
			<ScrollTextIcon class="text-accent" size={18} />
		{:else if result.kind === 'reservation'}
			<BookmarkCheckIcon class="text-success" size={18} />
		{:else if result.kind === 'group'}
			<UsersIcon class="text-danger" size={18} />
		{/if}
	</span>

	<span class="min-w-0 flex-1">
		<span class="block truncate text-sm font-semibold text-text">{result.entity.name}</span>
		{#if subtitle}
			<p class="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>
		{/if}
	</span>
</a>
