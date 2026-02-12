<script lang="ts">
	import { BookmarkCheckIcon, ContactIcon, ScrollTextIcon } from '@lucide/svelte';
	import type { SearchResult } from '$lib/server/services/search';

	let { result }: { result: SearchResult } = $props();

	const subtitle = $derived.by(() => {
		if (result.kind === 'list') return result.entity.description;
		if (result.kind === 'reservation') return result.entity.notes;
		return undefined;
	});

	const href = $derived.by(() => {
		if (result.kind === 'list') return `/lists/${result.entity.slug}`;
		if (result.kind === 'reservation') return `/lists/${result.entity.wishlistSlug}`;
		if (result.kind === 'mutual') return `/groups/${result.entity.groupId}`;
		return '/';
	});
</script>

<a
	class="flex min-w-0 items-start gap-3 rounded-lg border border-border-strong/70 bg-surface/65 px-3 py-2.5"
	{href}
>
	<span class="mt-0.5 shrink-0">
		{#if result.kind === 'mutual'}
			<ContactIcon class="text-danger" size={18} />
		{:else if result.kind === 'list'}
			<ScrollTextIcon class="text-accent" size={18} />
		{:else}
			<BookmarkCheckIcon class="text-success" size={18} />
		{/if}
	</span>

	<span class="min-w-0 flex-1">
		<span class="block truncate text-sm font-semibold text-text">{result.entity.name}</span>
		{#if subtitle}
			<p class="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>
		{/if}
	</span>
</a>
