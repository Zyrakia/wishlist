<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import { ArrowDownRight, CornerDownLeftIcon, SearchIcon, SparklesIcon } from '@lucide/svelte';
	import Loader from './loader.svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { isHttpError } from '@sveltejs/kit';
	import { onMount } from 'svelte';

	const hasJs = useHasJs();
	const questionWords = new Set([
		'who',
		'what',
		'when',
		'where',
		'why',
		'how',
		'is',
		'can',
		'does',
		'are',
		'do',
	]);

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
		return placeholderRotation[index] || '✨ Search people, items or ask questions...';
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

	const queryWords = $derived(cleanQuery.toLowerCase().split(' '));
	const isQueryQuestion = $derived.by(() => {
		if (cleanQuery.endsWith('?')) return true;
		if (queryWords.length < 2) return false;

		const startingWord = queryWords[0];
		if (!startingWord) return false;

		return questionWords.has(startingWord);
	});

	let isQuestionInProgress = $state(false);
	let questionResponse = $state('');
	let questionError = $state('');
	const shouldPromptToAsk = $derived(isQueryQuestion && !isQuestionInProgress);

	let searchFocused = $state(false);
	let searchHovered = $state(false);
	let resultsFocused = $state(false);
	let resultsHovered = $state(false);

	const searching = $derived.by(() => {
		if (searchFocused || resultsFocused) return true;
		return resultsHovered;
	});

	const closeSearch = () => {
		searchFocused = false;
		searchHovered = false;
		resultsFocused = false;
		resultsHovered = false;
	};

	const openSearch = () => {
		searchFocused = true;
	};

	const askQuestion = async () => {
		if (isQuestionInProgress) return;

		const question = cleanQuery;
		if (!question) return;

		isQuestionInProgress = true;

		questionResponse = '';
		questionError = '';
		query = '';

		try {
			const res = await fetch('/search', {
				method: 'POST',
				headers: { 'Content-Type': 'text/json', 'Accept': 'text/event-stream' },
				body: JSON.stringify({ question }),
			});

			const reader = res.body?.getReader();
			if (!reader) throw new Error('No reader obtained from search response stream');

			const decoder = new TextDecoder();

			let chunck: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>;
			while ((chunck = await reader.read()) && !chunck.done) {
				const rawValue = chunck.value;
				questionResponse += decoder.decode(rawValue, { stream: true });
			}
		} catch (err) {
			console.warn(err);

			if (isHttpError(err) && err.body.userMessage) {
				questionError = err.body.userMessage;
			} else questionError = 'An unknown error occurred during generation.';
		} finally {
			isQuestionInProgress = false;
		}
	};

	const handleKeyUp = (ev: KeyboardEvent) => {
		if (searching) {
			if (ev.key === 'Escape') closeSearch();
			else if (ev.key === 'Enter') askQuestion();
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

{#snippet askButton()}
	<button
		title="Ask Wishii AI"
		class="flex items-center gap-2 border-accent p-2 py-1 text-xs text-text"
		disabled={isQuestionInProgress || !cleanQuery}
		onclick={askQuestion}
		type="button"
	>
		<span>Ask</span>

		{#if searchFocused}
			<CornerDownLeftIcon size={12} />
		{/if}
	</button>
{/snippet}

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
			class="w-full max-w-full px-3 transition-all duration-300 sm:relative {searching
				? 'md:w-full'
				: 'md:w-2/3'}"
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
					onmouseenter={() => (searchHovered = true)}
					onmouseleave={() => (searchHovered = false)}
					class="w-full"
				/>

				{#if !query}
					{#key currentPlaceholder}
						<span
							transition:fade
							class="pointer-events-none absolute left-3 flex items-center gap-2 {searching
								? 'text-text-muted/50'
								: 'text-text-muted'}"
						>
							<SparklesIcon size={18} />

							<span class={searching ? '' : 'placeholder-glow'}>
								{currentPlaceholder}
							</span>
						</span>
					{/key}
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
				class="absolute bottom-full left-0 max-h-85 min-h-0 w-full transition-[opacity,translate] md:top-full md:bottom-[unset] {searching
					? 'pointer-events-auto translate-y-0 opacity-100'
					: 'pointer-events-none -translate-y-8 opacity-0'}"
			>
				<div
					role="group"
					aria-label="Search Results"
					class="mb-2 flex flex-col gap-3 rounded-md border bg-surface p-3 md:mt-2 md:mb-0 {resultsFocused
						? 'border-primary'
						: 'border-accent'}"
				>
					<ul class="flex-1 overflow-y-auto" role="listbox">
						<p class="text-text-muted italic">No results...</p>
					</ul>

					<hr class="border-border-strong" />

					<div role="group" aria-label="AI Assistant">
						<div
							class={`flex items-center gap-2 text-accent ${isQuestionInProgress || shouldPromptToAsk ? 'animate-[color-shift_2s_ease-in-out_infinite]' : ''}`}
						>
							<SparklesIcon size={18} />

							<span class="me-auto">Wishii AI</span>

							{#if !shouldPromptToAsk && !isQuestionInProgress}
								{@render askButton()}
							{/if}
						</div>

						{#if shouldPromptToAsk}
							<div
								transition:slide={{ duration: 150 }}
								class="flex items-center gap-2"
							>
								<ArrowDownRight
									class="shrink-0 animate-pulse text-accent"
									size={14}
								/>

								<p class="me-auto truncate text-text-muted italic">
									<span class="text-accent">Ask: </span>
									{cleanQuery}
								</p>

								{@render askButton()}
							</div>
						{/if}

						{#if isQuestionInProgress && !questionResponse}
							<div class="h-12 w-12 pt-2">
								<Loader
									thickness="2px"
									pulseDur="1.25s"
									pulseStaggerDur="250ms"
									pulseCount={2}
								/>
							</div>
						{:else if questionResponse}
							<div
								aria-live="polite"
								class="mt-2 font-mono tracking-tight wrap-break-word whitespace-pre-wrap"
							>
								{questionResponse}
							</div>
						{:else if questionError}
							<p class="mt-2 text-danger/75 italic">{questionError}</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes color-shift {
		0%,
		100% {
			color: var(--color-accent);
		}
		50% {
			color: var(--color-shimmer);
		}
	}

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
