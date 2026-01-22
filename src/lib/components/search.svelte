<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { SearchIcon, SparklesIcon } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import SearchAi from './search-ai.svelte';

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
		'How do I leave a group?',
		'What is a list connection?',
	];

	const getRandomPlaceholder = () => {
		const index = Math.floor(Math.random() * placeholderRotation.length);
		return placeholderRotation[index] || 'Search people, items or ask questions...';
	};

	let currentPlaceholder = $state(getRandomPlaceholder());

	let query = $state('');
	const cleanQuery = $derived(
		query
			.trim()
			.split(' ')
			.map((v) => v.trim())
			.filter((v) => v !== '')
			.join(' '),
	);

	let searchFocused = $state(false);
	let resultsFocused = $state(false);
	let resultsHovered = $state(false);

	const searching = $derived.by(() => {
		if (searchFocused || resultsFocused) return true;
		return resultsHovered;
	});

	const closeSearch = () => {
		searchFocused = false;
		resultsFocused = false;
		resultsHovered = false;
	};

	const openSearch = () => {
		searchFocused = true;
	};

	let aiRef: ReturnType<typeof SearchAi> | undefined = $state();

	const handleKeyUp = (ev: KeyboardEvent) => {
		if (searching) {
			if (ev.key === 'Escape') closeSearch();
			else if (ev.key === 'Enter') aiRef?.ask();
		} else {
			if (ev.key === '/') openSearch();
		}
	};

	let searchRef: HTMLInputElement | undefined = $state();
	$effect(() => {
		if (!searchRef) return;

		if (searchFocused) searchRef?.focus();
		else searchRef.blur();
	});

	onMount(() => {
		const changePlaceholderTick = setInterval(() => {
			currentPlaceholder = getRandomPlaceholder();
		}, 5000);

		return () => clearInterval(changePlaceholderTick);
	});
</script>

<svelte:window onkeyup={handleKeyUp} />

{#if hasJs()}
	<div title="Search Wishii" class="relative flex w-full items-center justify-center gap-4 px-4">
		<SearchIcon
			size={20}
			class={`shrink-0 transition-colors ${searching ? 'text-accent' : 'text-text'}`}
		/>

		<div
			role="combobox"
			aria-expanded={searching}
			aria-haspopup="dialog"
			aria-controls="search-panel"
			class="w-full max-w-full transition-all duration-300 sm:relative md:max-w-lg lg:max-w-4/5 {searching
				? 'lg:w-xl'
				: 'lg:w-md'}"
		>
			<div class="relative flex w-full items-center">
				<input
					name="Global Search"
					aria-autocomplete="none"
					aria-expanded={searching}
					aria-controls="search-panel"
					bind:this={searchRef}
					bind:value={query}
					onfocus={() => (searchFocused = true)}
					onblur={() => (searchFocused = false)}
					class="w-full"
				/>

				{#if !query}
					<span
						class="pointer-events-none absolute left-3 flex w-full items-center gap-2 overflow-hidden {searching
							? 'text-text-muted/50'
							: 'text-text-muted'}"
					>
						<SparklesIcon size={18} />

						{#key currentPlaceholder}
							<span
								transition:fly={{ y: 50 }}
								class="{searching
									? ''
									: 'placeholder-glow'} absolute max-w-full truncate ps-7 pe-6"
							>
								{currentPlaceholder}
							</span>
						{/key}
					</span>
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
				class="scrollbar-thin absolute bottom-full left-0 mb-2 max-h-85 min-h-0 w-full overflow-y-auto rounded-md border bg-surface transition-[opacity,translate] md:top-full md:bottom-[unset] md:mt-2 md:mb-0 {searching
					? 'pointer-events-auto translate-y-0 opacity-100'
					: 'pointer-events-none -translate-y-8 opacity-0'} {resultsFocused
					? 'border-primary'
					: 'border-accent'}"
			>
				<div role="group" aria-label="Search Results" class="flex flex-col gap-3 p-3">
					<ul class="flex-1 overflow-y-auto" role="listbox">
						<p class="text-text-muted italic">No results...</p>
					</ul>

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
