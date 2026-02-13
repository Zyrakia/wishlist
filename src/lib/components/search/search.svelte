<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { ArrowBigRightIcon, SearchIcon, SlashIcon, SparklesIcon } from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';
	import SearchAi from './search-ai.svelte';
	import SearchGlobal from './search-global.svelte';
	import { likelyHasKeyboard } from '$lib/runes/media.svelte';
	import { getSuggestedPrompt } from '$lib/runes/assistant-indicators.svelte';
	import Loader from '../loader.svelte';

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

	let searchFocused = $state(false);
	let resultsFocused = $state(false);
	let resultsHovered = $state(false);

	let globalLoading = $state(false);
	let aiLoading = $state(false);
	const isLoading = $derived(globalLoading || aiLoading);

	const searchOpen = $derived.by(() => {
		if (searchFocused || resultsFocused) return true;
		return resultsHovered;
	});

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

	const setRandomPlaceholder = () => {
		const index = Math.floor(Math.random() * placeholderRotation.length);
		currentPlaceholder = placeholderRotation[index];
	};

	const setDefaultPlaceholder = () => {
		currentPlaceholder = 'Search people, items or ask questions...';
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
		else if (ev.key === 'Enter') {
			if (mode === 'ask' && cleanQuery) aiRef?.ask();
		} else if (ev.key === 'ArrowRight') {
			tryInsertPlaceholder();
		}
	};

	const handleInputBlur = () => {
		searchFocused = false;
	};

	let placeholderInterval: NodeJS.Timeout | undefined;
	const runPlaceholderLoop = () => {
		killPlaceholderLoop();
		setRandomPlaceholder();
		placeholderInterval = setInterval(setRandomPlaceholder, 5000);
	};

	const killPlaceholderLoop = () => {
		if (!placeholderInterval) return;
		clearTimeout(placeholderInterval);
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
			currentPlaceholder = suggested.prompt;
			inputBorderColor = suggested.color;
			return;
		}

		currentPlaceholder = '';
		inputBorderColor = undefined;

		if (mode === 'search') {
			killPlaceholderLoop();
			setDefaultPlaceholder();
		} else runPlaceholderLoop();
	});

	$effect(() => {
		// Delay for 150ms because the focus switching could run this multiple times
		if (!searchOpen) {
			setTimeout(() => {
				if (searchOpen) return;
				mode = 'search';
			}, 150);
		}
	});

	const hasJs = useHasJs();
</script>

<svelte:window onkeyup={handleKeyUp} onkeydown={handleKeyDown} />

{#if hasJs()}
	<div title="Search Wishii" class="relative flex w-full items-center justify-center gap-4 px-4">
		<div class="shrnk-0 relative flex size-8 items-center justify-center">
			{#if isLoading}
				<span
					in:fade={{ duration: 120 }}
					out:fade={{ duration: 120 }}
					class="absolute h-full w-full"
				>
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
					onblur={handleInputBlur}
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
								class="absolute max-w-full truncate ps-7 pe-11 {mode === 'search'
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
					{#if mode === 'ask'}
						<button
							type="button"
							onclick={exitAskMode}
							class="w-full rounded-md border border-accent/70 bg-accent/10 px-4 py-3 text-center font-semibold text-accent transition-colors hover:bg-accent/20"
						>
							Exit Ask Mode
						</button>
					{:else}
						<SearchGlobal query={cleanQuery} bind:loading={globalLoading} />
					{/if}

					<hr class="border-border-strong" />

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
</style>
