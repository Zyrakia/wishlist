<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { ArrowBigRightIcon, SearchIcon, SlashIcon, SparklesIcon } from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';
	import SearchAi from './search-ai.svelte';
	import SearchGlobal from './search-global.svelte';
	import { likelyHasKeyboard } from '$lib/runes/media.svelte';
	import { getSuggestedPrompt } from '$lib/runes/assistant-indicators.svelte';
	import Loader from '../loader.svelte';

	let {
		searchFocused = $bindable(false),
		onOpenChange,
	}: { searchFocused?: boolean; onOpenChange?: (open: boolean) => void } = $props();

	let mode: 'ask' | 'search' = $state('search');

	let query = $state('');
	const cleanQuery = $derived(
		query
			.trim()
			.split(' ')
			.map((v) => v.trim())
			.filter((v) => v !== '')
			.join(' '),
	);

	let resultsFocused = $state(false);
	let resultsHovered = $state(false);

	let globalLoading = $state(false);
	let aiLoading = $state(false);
	const isLoading = $derived(globalLoading || aiLoading);

	const searchOpen = $derived.by(() => {
		if (searchFocused || resultsFocused) return true;
		return resultsHovered;
	});

	$effect(() => void onOpenChange?.(searchOpen));

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

	let aiRef: ReturnType<typeof SearchAi> | undefined = $state();
	let searchGlobalRef: ReturnType<typeof SearchGlobal> | undefined = $state();

	const setRandomPlaceholder = () => {
		const index = Math.floor(Math.random() * placeholderRotation.length);
		currentPlaceholder = placeholderRotation[index];
	};

	const setDefaultPlaceholder = () => {
		currentPlaceholder = 'Search people, lists or reservations...';
	};

	const tryInsertPlaceholder = () => {
		if (query) return;
		query = currentPlaceholder;
	};

	const blurAll = () => {
		searchFocused = false;
		resultsFocused = false;
		resultsHovered = false;
	};

	const activateAskMode = () => {
		mode = 'ask';
		searchFocused = true;
	};

	const exitAskMode = () => {
		mode = 'search';
		searchFocused = true;
	};

	const handleKeyUp = (ev: KeyboardEvent) => {
		if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement)
			return;

		if (ev.key === '/') searchFocused = true;
	};

	const handleKeyDown = (ev: KeyboardEvent) => {
		if (!searchOpen) return;

		if (ev.key === 'Escape') blurAll();
		else if (mode === 'search' && ev.key === 'ArrowDown') {
			if (searchGlobalRef?.selectNext()) ev.preventDefault();
		} else if (mode === 'search' && ev.key === 'ArrowUp') {
			if (searchGlobalRef?.selectPrevious()) ev.preventDefault();
		} else if (ev.key === 'Enter') {
			if (mode === 'ask' && cleanQuery) aiRef?.ask();
			else if (mode === 'search') {
				const selected = document.querySelector<HTMLAnchorElement>(
					'a[data-search-result-active="true"]',
				);

				if (!selected) return;

				ev.preventDefault();
				selected?.click();
			}
		} else if (ev.key === 'ArrowRight') {
			tryInsertPlaceholder();
		}
	};

	const handleInputBlur = () => {
		searchFocused = false;
	};

	const handleResultsFocusIn = () => {
		resultsFocused = true;
	};

	const handleResultsFocusOut = (ev: FocusEvent) => {
		const panel = ev.currentTarget;
		if (!(panel instanceof HTMLElement)) {
			resultsFocused = false;
			return;
		}

		const nextFocusTarget = ev.relatedTarget;
		if (nextFocusTarget instanceof Node && panel.contains(nextFocusTarget)) {
			return;
		}

		resultsFocused = false;
	};

	let placeholderInterval: NodeJS.Timeout | undefined;
	const runPlaceholderLoop = () => {
		killPlaceholderLoop();
		setRandomPlaceholder();
		placeholderInterval = setInterval(setRandomPlaceholder, 5000);
	};

	const killPlaceholderLoop = () => {
		if (!placeholderInterval) return;
		clearInterval(placeholderInterval);
		placeholderInterval = undefined;
	};

	let searchRef: HTMLInputElement | undefined = $state();
	$effect(() => {
		if (!searchRef) return;

		if (searchFocused) {
			searchRef.focus();
			inputBorderColor = undefined;
		} else {
			searchRef.blur();
		}
	});

	$effect(() => {
		const suggested = getSuggestedPrompt();
		if (suggested) {
			killPlaceholderLoop();
			currentPlaceholder = suggested.prompt;
			inputBorderColor = suggested.color;
			return;
		}

		currentPlaceholder = '';
		inputBorderColor = undefined;

		if (mode === 'search') {
			killPlaceholderLoop();
			setDefaultPlaceholder();
			return;
		}

		runPlaceholderLoop();
		return () => void killPlaceholderLoop();
	});

	const hasJs = useHasJs();
</script>

<svelte:window onkeyup={handleKeyUp} onkeydown={handleKeyDown} />

{#if hasJs()}
	<div title="Search Wishii" class="relative flex w-full items-center justify-center gap-4 px-4">
		<div
			role="combobox"
			aria-expanded={searchOpen}
			aria-haspopup="dialog"
			aria-controls="search-panel"
			class="w-full max-w-full transition-all duration-300 sm:relative md:max-w-sm lg:max-w-lg xl:max-w-xl"
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
					onblur={handleInputBlur}
					class={[
						'w-full ps-10 transition-colors',
						mode === 'ask' && searchOpen && !inputBorderColor && 'ask-border',
					]}
					style:border-color={inputBorderColor}
				/>

				<span
					class="pointer-events-none absolute left-3 flex size-[18px] items-center justify-center transition-colors {mode ===
						'ask' && searchOpen
						? 'text-accent'
						: 'text-text-muted'}"
				>
					{#if isLoading}
						<Loader
							thickness="2px"
							pulseDur="500ms"
							pulseStaggerDur="75ms"
							pulseCount={2}
						/>
					{:else if mode === 'ask'}
						<SparklesIcon size={18} />
					{:else}
						<SearchIcon size={18} />
					{/if}
				</span>

				{#if !query}
					<p
						class="pointer-events-none absolute flex w-full items-center justify-end gap-2 overflow-hidden px-3 {searchOpen
							? 'text-text-muted/50'
							: 'text-text-muted'}"
					>
						{#key currentPlaceholder}
							<span
								transition:fly={{ y: 50 }}
								class="absolute left-3 max-w-full truncate ps-7 pe-11 {mode ===
								'ask'
									? 'placeholder-glow'
									: ''}"
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
									onclick={() => tryInsertPlaceholder()}
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
				onfocusin={handleResultsFocusIn}
				onfocusout={handleResultsFocusOut}
				onmouseenter={() => (resultsHovered = true)}
				onmouseleave={() => (resultsHovered = false)}
				class="scrollbar-thin absolute bottom-full left-0 mb-2 max-h-85 min-h-0 w-full overflow-y-auto rounded-md border bg-surface transition-[opacity,translate] md:top-full md:bottom-[unset] md:mt-2 md:mb-0 {searchOpen
					? 'pointer-events-auto translate-y-0 opacity-100'
					: 'pointer-events-none -translate-y-8 opacity-0'} {mode === 'ask'
					? 'border-accent/50'
					: 'border-border-strong'}"
			>
				<div role="group" aria-label="Search Results" class="flex flex-col gap-3 px-3 py-4">
					<div
						role="tablist"
						aria-label="Search mode"
						class="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
					>
						<button
							type="button"
							role="tab"
							aria-selected={mode === 'search'}
							onmousedown={(e) => e.preventDefault()}
							onclick={exitAskMode}
							class={[
								'flex items-center justify-center gap-2 rounded-md border-0 px-3 py-1.5 text-sm',
								mode === 'search'
									? 'bg-surface text-text shadow-sm ring-1 ring-border-strong/70'
									: 'bg-transparent text-text-muted',
							]}
						>
							<SearchIcon size={14} />
							Search
						</button>

						<button
							type="button"
							role="tab"
							aria-selected={mode === 'ask'}
							onmousedown={(e) => e.preventDefault()}
							onclick={activateAskMode}
							class={[
								'flex items-center justify-center gap-2 rounded-md border-0 px-3 py-1.5 text-sm',
								mode === 'ask'
									? 'bg-surface text-accent shadow-sm ring-1 ring-accent/70'
									: 'bg-transparent text-text-muted',
							]}
						>
							<SparklesIcon size={14} />
							Ask AI
						</button>
					</div>

					{#if mode === 'search'}
						<SearchGlobal
							bind:this={searchGlobalRef}
							query={cleanQuery}
							bind:loading={globalLoading}
						/>

						<hr class="border-border-strong" />
					{/if}

					<SearchAi
						bind:this={aiRef}
						query={cleanQuery}
						{searchFocused}
						active={mode === 'ask'}
						onactivate={activateAskMode}
						onask={() => (query = '')}
						promptToAsk={mode === 'ask'}
						bind:loading={aiLoading}
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

	.ask-border {
		animation: ask-border-pulse 3s ease-in-out infinite;
	}

	@keyframes ask-border-pulse {
		0%,
		100% {
			border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border-strong));
		}
		50% {
			border-color: color-mix(in srgb, var(--color-accent) 65%, var(--color-border-strong));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ask-border,
		.placeholder-glow {
			animation: none;
		}
	}
</style>
