<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { ArrowBigRightIcon, SearchIcon, SlashIcon, SparklesIcon } from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';
	import SearchAi from './search-ai.svelte';
	import SearchResultTesting from './search-result.svelte';
	import type { SearchResult } from '$lib/server/services/search';
	import { likelyHasKeyboard } from '$lib/runes/media.svelte';
	import { getSuggestedPrompt } from '$lib/runes/assistant-indicators.svelte';
	import { runGlobalSearch } from '$lib/remotes/search.remote';
	import Loader from './loader.svelte';

	const hasJs = useHasJs();

	const placeholderRotation = [
		'How do I create a list?',
		'How can I link my Amazon list?',
		'How do I create a group for my family?',
		'How many items can I have on my wishlist?',
		'How do I invite someone to my group?',
		'How do I share my wishlist?',
		'How do I add an item from a link?',
		'What happens when I reserve an item?',
		'How do I prioritize items on my list?',
		'Can I reorganize items on my list?',
		'How do I sync my external wishlist?',
		'How many connections can I have?',
		'How do I change my password?',
		'Can others see my reservations?',
		'What is a list connection?',
	];

	let currentPlaceholder = $state('');
	let inputBorderColor = $state<string | undefined>();

	let query = $state('');
	const cleanQuery = $derived(
		query
			.trim()
			.split(' ')
			.map((v) => v.trim())
			.filter((v) => v !== '')
			.join(' '),
	);

	let searchFocused = $state(true);
	let resultsFocused = $state(false);
	let resultsHovered = $state(false);

	let searchResults = $state<SearchResult[]>([]);
	let searchPending = $state(false);
	let searchInflight = $state(false);
	let searchError = $state('');

	const searchOpen = $derived.by(() => {
		if (searchFocused || resultsFocused) return true;
		return resultsHovered;
	});

	let aiRef: ReturnType<typeof SearchAi> | undefined = $state();

	const setRandomPlaceholder = () => {
		const index = Math.floor(Math.random() * placeholderRotation.length);
		currentPlaceholder =
			placeholderRotation[index] || 'Search people, items or ask questions...';
	};

	const tryTakePlaceholder = () => {
		if (query) return;
		query = currentPlaceholder;
	};

	const closeSearch = () => {
		searchFocused = false;
		resultsFocused = false;
		resultsHovered = false;
	};

	const openSearch = () => {
		searchFocused = true;
	};

	const handleKeyUp = (ev: KeyboardEvent) => {
		if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement)
			return;
		if (ev.key === '/') openSearch();
	};

	const handleKeyDown = (ev: KeyboardEvent) => {
		if (!searchOpen) return;

		if (ev.key === 'Escape') closeSearch();
		else if (ev.key === 'Enter') {
			if (query) aiRef?.ask();
			else setRandomPlaceholder();
		} else if (ev.key === 'ArrowRight') {
			tryTakePlaceholder();
		}
	};

	const runSearch = async () => {
		if (searchInflight) return;
		searchInflight = true;

		try {
			const query = cleanQuery;
			if (!query) return;

			searchError = '';
			const result = await runGlobalSearch({ query });

			if ('error' in result) {
				searchError = result.error;
			} else searchResults = result;
		} catch (err) {
			console.warn(err);
			searchError = 'Unknown error, please try typing your query again.';
		} finally {
			searchInflight = false;
		}
	};

	const getResultKey = (result: SearchResult) => {
		if (result.kind === 'mutual') return `mutual:${result.entity.userId}`;
		if (result.kind === 'list') return `list:${result.entity.slug}`;
		return `reservation:${result.entity.itemId}`;
	};

	let searchRef: HTMLInputElement | undefined = $state();
	$effect(() => {
		if (!searchRef) return;

		if (searchFocused) {
			searchRef?.focus();
			inputBorderColor = undefined;
		} else searchRef.blur();
	});

	$effect(() => {
		const suggested = getSuggestedPrompt();
		if (suggested) {
			currentPlaceholder = suggested.prompt;
			inputBorderColor = suggested.color;

			return;
		}

		inputBorderColor = undefined;

		setRandomPlaceholder();
		const interval = setInterval(setRandomPlaceholder, 5000);
		return () => clearInterval(interval);
	});

	$effect(() => {
		const query = cleanQuery;
		if (!query) {
			searchResults = [];
			searchError = '';
			return;
		}

		searchPending = true;
		const timeout = setTimeout(() => {
			runSearch();
			searchPending = false;
		}, 300);

		return () => {
			searchPending = false;
			clearTimeout(timeout);
		};
	});
</script>

<svelte:window onkeyup={handleKeyUp} onkeydown={handleKeyDown} />

{#if hasJs()}
	<div title="Search Wishii" class="relative flex w-full items-center justify-center gap-4 px-4">
		<div class="shrnk-0 relative flex size-8 items-center justify-center">
			{#if searchPending || searchInflight}
				<span in:fade={{ duration: 120 }} out:fade={{ duration: 120 }} class="absolute w-full h-full">
					<Loader
						thickness="2px"
						pulseDur="500ms"
						pulseStaggerDur="75ms"
						pulseCount={2}
					/>
				</span>
			{:else}
				<span in:fade={{ duration: 120 }} out:fade={{ duration: 120 }} class="absolute">
					<SearchIcon
						size={20}
						class={`shrink-0 transition-colors ${searchOpen ? 'text-accent' : 'text-text'}`}
					/>
				</span>
			{/if}
		</div>

		<div
			role="combobox"
			aria-expanded={searchOpen}
			aria-haspopup="dialog"
			aria-controls="search-panel"
			class="w-full max-w-full transition-all duration-300 sm:relative md:max-w-lg lg:max-w-4/5 {searchOpen
				? 'lg:w-xl'
				: 'lg:w-md'}"
		>
			<div class="relative flex w-full items-center">
				<input
					name="Global Search"
					aria-autocomplete="none"
					aria-expanded={searchOpen}
					aria-controls="search-panel"
					bind:this={searchRef}
					bind:value={query}
					onfocus={() => (searchFocused = true)}
					onblur={() => (searchFocused = false)}
					class="w-full"
					style:border-color={inputBorderColor}
				/>

				{#if !query}
					<p
						class="pointer-events-none absolute flex w-full items-center justify-between gap-2 overflow-hidden px-3 {searchOpen
							? 'text-text-muted/50'
							: 'text-text-muted'}"
					>
						<SparklesIcon size={18} />

						{#key currentPlaceholder}
							<span
								transition:fly={{ y: 50 }}
								class="absolute max-w-full truncate ps-7 pe-11 {searchOpen
									? ''
									: 'placeholder-glow'}"
							>
								{currentPlaceholder}
							</span>
						{/key}

						{#if searchOpen}
							<span in:fade>
								<ArrowBigRightIcon
									size={18}
									class="pointer-events-auto cursor-pointer"
									onmousedown={(e) => e.preventDefault()}
									onclick={() => tryTakePlaceholder()}
								/>
							</span>
						{:else if likelyHasKeyboard.current}
							<span in:fade>
								<SlashIcon size={18} />
							</span>
						{/if}
					</p>
				{/if}
			</div>

			<div
				id="search-panel"
				role="dialog"
				aria-label="Search Results and AI"
				tabindex="0"
				onfocus={() => (resultsFocused = true)}
				onblur={() => (resultsFocused = false)}
				onmouseenter={() => (resultsHovered = true)}
				onmouseleave={() => (resultsHovered = false)}
				class="scrollbar-thin absolute bottom-full left-0 mb-2 max-h-85 min-h-0 w-full overflow-y-auto rounded-md border bg-surface transition-[opacity,translate] md:top-full md:bottom-[unset] md:mt-2 md:mb-0 {searchOpen
					? 'pointer-events-auto translate-y-0 opacity-100'
					: 'pointer-events-none -translate-y-8 opacity-0'} {resultsFocused
					? 'border-primary'
					: 'border-accent'}"
			>
				<div role="group" aria-label="Search Results" class="flex flex-col gap-3 px-3 py-4">
					<div class="relative">
						<ul class="flex flex-1 flex-col gap-2 overflow-y-auto" role="listbox">
							{#if searchError}
								<p class="text-danger italic">
									{searchError}
								</p>
							{:else if searchResults.length}
								{#each searchResults as result, i (getResultKey(result))}
									<li
										in:fly={{ x: -24, y: 6, duration: 260, delay: i * 30 }}
										out:fly={{ x: -8, duration: 140 }}
									>
										<SearchResultTesting {result} />
									</li>
								{/each}
							{:else if !searchPending && !searchInflight}
								<p class="text-text-muted italic">
									{#if !cleanQuery}
										Search through your mutuals, lists and reserved items.
									{:else}
										No results...
									{/if}
								</p>
							{/if}
						</ul>
					</div>

					<hr class="border-border-strong" />

					<SearchAi
						bind:this={aiRef}
						query={cleanQuery}
						{searchFocused}
						onask={() => (query = '')}
					/>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.placeholder-glow {
		background: linear-gradient(
			90deg,
			var(--color-text-muted) 0%,
			var(--color-text-muted) 35%,
			var(--color-accent) 45%,
			var(--color-shimmer) 50%,
			var(--color-accent) 55%,
			var(--color-text-muted) 65%,
			var(--color-text-muted) 100%
		);

		background-size: 200% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		animation: slide-glow 3s ease-in-out infinite;
	}

	@keyframes slide-glow {
		0% {
			background-position: 100% 0;
			text-shadow: none;
		}
		45% {
			text-shadow: 0 0 6px color-mix(in srgb, var(--color-accent) 40%, transparent);
		}
		55% {
			text-shadow: 0 0 6px color-mix(in srgb, var(--color-accent) 40%, transparent);
		}
		100% {
			background-position: -100% 0;
			text-shadow: none;
		}
	}
</style>
