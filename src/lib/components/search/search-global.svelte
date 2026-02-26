<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { SearchResult } from '$lib/schemas/search';
	import SearchResultItem from './search-result.svelte';
	import { runGlobalSearch } from '$lib/remotes/search.remote';

	interface Props {
		query: string;
		loading?: boolean;
	}

	let { query, loading = $bindable(false) }: Props = $props();

	let searchResults = $state<SearchResult[]>([]);
	let searchQueued = $state(false);
	let searchInflight = $state(false);
	let searchError = $state('');
	let activeIndex = $state(-1);

	let resultsRef: HTMLUListElement | undefined = $state();

	const getResultKey = (result: SearchResult): string => {
		switch (result.kind) {
			case 'mutual':
				return `mutual:${result.entity.userId}`;
			case 'list':
				return `list:${result.entity.slug}`;
			case 'reservation':
				return `reservation:${result.entity.itemId}`;
			case 'group':
				return `group:${result.entity.id}`;
		}
	};

	const runSearch = async () => {
		if (searchInflight) return;
		searchInflight = true;

		try {
			if (!query) return;

			searchError = '';
			const result = await runGlobalSearch({ query });

			if ('error' in result) {
				searchError = result.error;
			} else searchResults = result;
		} catch (err) {
			console.warn(err);
			searchError = 'Unknown error';
		} finally {
			searchInflight = false;
		}
	};

	$effect(() => {
		if (!query) {
			searchResults = [];
			searchError = '';
			searchQueued = false;
			return;
		}

		searchQueued = true;
		const timeout = setTimeout(() => {
			runSearch();
			searchQueued = false;
		}, 300);

		return () => {
			searchQueued = false;
			clearTimeout(timeout);
		};
	});

	$effect(() => {
		loading = searchQueued || searchInflight;
	});

	$effect(() => {
		if (searchError || !searchResults.length) {
			activeIndex = -1;
			return;
		}

		activeIndex = Math.max(0, Math.min(activeIndex, searchResults.length - 1));
	});

	$effect(() => {
		if (!resultsRef || activeIndex < 0) return;

		const activeResult = resultsRef.querySelector<HTMLElement>(
			`[data-search-result-index="${activeIndex}"]`,
		);

		activeResult?.scrollIntoView({ block: 'nearest' });
	});

	export const selectNext = () => {
		if (!searchResults.length || searchError) return false;

		activeIndex = activeIndex >= searchResults.length - 1 ? 0 : activeIndex + 1;
		return true;
	};

	export const selectPrevious = () => {
		if (!searchResults.length || searchError) return false;

		activeIndex = activeIndex <= 0 ? searchResults.length - 1 : activeIndex - 1;
		return true;
	};
</script>

<div class="relative">
	<ul
		bind:this={resultsRef}
		class="flex flex-1 flex-col gap-2 overflow-y-auto"
		role="listbox"
		aria-label="Search results"
	>
		{#each searchError ? [] : searchResults as result, i (getResultKey(result))}
			<li
				role="option"
				aria-selected={activeIndex === i}
				onmouseenter={() => (activeIndex = i)}
				onfocusin={() => (activeIndex = i)}
				in:fly={{ x: -24, y: 6, duration: 260, delay: i * 30 }}
				out:fly={{ x: -8, duration: 140 }}
			>
				<SearchResultItem {result} index={i} active={activeIndex === i} />
			</li>
		{/each}

		{#if searchError}
			<li class="text-danger italic" role="option" aria-disabled="true">
				{searchError}
			</li>
		{:else if !searchResults.length}
			<li class="text-text-muted italic" role="presentation">
				{#if searchQueued || searchInflight}
					Loading...
				{:else if !query}
					Search through your mutuals, lists and reserved items.
					<br />
					You can also ask the Wishii Assistant a question!
				{:else}
					No results, but maybe you can ask our assistant below!
				{/if}
			</li>
		{/if}
	</ul>
</div>
