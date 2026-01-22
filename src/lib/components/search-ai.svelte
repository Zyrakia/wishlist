<script lang="ts">
	import { ArrowDownRight, CornerDownLeftIcon, SparklesIcon } from '@lucide/svelte';
	import Loader from './loader.svelte';
	import { slide } from 'svelte/transition';
	import { isHttpError } from '@sveltejs/kit';

	interface Props {
		query: string;
		searchFocused: boolean;
		onask?: () => void;
	}

	const { query, searchFocused, onask }: Props = $props();

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

	const queryWords = $derived(query.toLowerCase().split(' '));
	const isQueryQuestion = $derived.by(() => {
		if (query.endsWith('?')) return true;
		if (queryWords.length < 2) return false;

		const startingWord = queryWords[0];
		if (!startingWord) return false;

		return questionWords.has(startingWord);
	});

	let isQuestionInProgress = $state(false);
	let questionResponse = $state('');
	let questionError = $state('');
	const shouldPromptToAsk = $derived(isQueryQuestion && !isQuestionInProgress);

	export const ask = async () => {
		if (isQuestionInProgress) return;
		if (!query) return;

		isQuestionInProgress = true;
		questionResponse = '';
		questionError = '';

		onask?.();

		try {
			const res = await fetch('/search', {
				method: 'POST',
				headers: { 'Content-Type': 'text/json', 'Accept': 'text/event-stream' },
				body: JSON.stringify({ question: query }),
			});

			const reader = res.body?.getReader();
			if (!reader) throw new Error('No reader obtained from search response stream');

			const decoder = new TextDecoder();

			let chunk: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>;
			while ((chunk = await reader.read()) && !chunk.done) {
				const rawValue = chunk.value;
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
</script>

{#snippet askButton()}
	<button
		title="Ask Wishii AI"
		class="flex items-center gap-2 border-accent p-2 py-1 text-xs text-text"
		disabled={isQuestionInProgress || !query}
		onclick={ask}
		type="button"
	>
		<span>Ask</span>

		{#if searchFocused}
			<CornerDownLeftIcon size={12} />
		{/if}
	</button>
{/snippet}

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
		<div transition:slide={{ duration: 150 }} class="flex items-center gap-2">
			<ArrowDownRight class="shrink-0 animate-pulse text-accent" size={14} />

			<p class="me-auto truncate text-text-muted italic">
				<span class="text-accent">Ask: </span>
				{query}
			</p>

			{@render askButton()}
		</div>
	{/if}

	{#if isQuestionInProgress && !questionResponse}
		<div class="h-12 w-12 pt-2">
			<Loader thickness="2px" pulseDur="1.25s" pulseStaggerDur="250ms" pulseCount={2} />
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
</style>
