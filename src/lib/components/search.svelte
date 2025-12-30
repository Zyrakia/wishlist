<script lang="ts">
	import { useHasJs } from '$lib/runes/has-js.svelte';
	import {
		CircleQuestionMarkIcon,
		CornerDownLeftIcon,
		SearchIcon,
		SparklesIcon,
	} from '@lucide/svelte';
	import Loader from './loader.svelte';
	import { slide } from 'svelte/transition';

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

	let isAsking = $state(false);
	let questionResponse = $state('');
	let questionError = $state('');
	const question = $derived(isQueryQuestion ? cleanQuery : '');
	const shouldPromptToAsk = $derived(question && !isAsking);

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
		if (isAsking) return;

		const prompt = question || cleanQuery;
		if (!prompt) return;

		isAsking = true;

		questionResponse = '';
		questionError = '';
		query = '';

		console.log(`Asking "${prompt}"`);

		setTimeout(() => {
			isAsking = false;
		}, 2000);
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
</script>

<svelte:window onkeyup={handleKeyUp} />

{#snippet askButton()}
	<button
		title="Ask Wishii AI"
		class="flex items-center gap-2 border-accent p-2 py-1 text-xs text-text"
		disabled={isAsking || !cleanQuery}
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
				placeholder="✨ Search people, items or ask questions..."
			/>

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
						<div class="flex items-center gap-2 text-accent">
							<SparklesIcon size={18} />

							<span class="me-auto">Wishii AI</span>

							{#if !shouldPromptToAsk && !isAsking}
								{@render askButton()}
							{/if}
						</div>

						{#if shouldPromptToAsk}
							<div
								in:slide={{ duration: 150 }}
								out:slide={{ duration: 150 }}
								class="flex items-center gap-2"
							>
								<CircleQuestionMarkIcon class="shrink-0" size={14} />

								<p class="me-auto truncate text-text-muted italic">{question}</p>

								{@render askButton()}
							</div>
						{/if}

						{#if isAsking}
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
								class="mt-2 font-mono wrap-break-word whitespace-pre-wrap"
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
