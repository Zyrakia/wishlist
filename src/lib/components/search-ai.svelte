<script lang="ts">
	import {
		ArrowDownRight,
		CornerDownLeftIcon,
		MessageCircleQuestionMarkIcon,
		SparklesIcon,
	} from '@lucide/svelte';
	import Loader from './loader.svelte';
	import Markdown from './markdown.svelte';
	import { slide } from 'svelte/transition';
	import { AppErrorSchema } from '$lib/schemas/error';
	import { getAssistantContext } from '$lib/runes/assistant-indicators.svelte';

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
	let lastSubmittedQuery = $state('');
	let questionResponse = $state('');
	let questionError = $state('');

	const shouldPromptToAsk = $derived(isQueryQuestion && !isQuestionInProgress);

	const getQueryAsPrompt = () => {
		if (!query) return;

		const lines: string[] = [];

		const context = getAssistantContext();
		if (context) {
			lines.push('Page Context (may not be relevant to the question):');
			lines.push(context);
			lines.push('');
		}

		lines.push(`User Question: ${query}`);

		return lines.join('\n');
	};

	export const ask = async () => {
		if (isQuestionInProgress) return;

		const prompt = getQueryAsPrompt();
		if (!prompt) return;

		console.log(prompt);

		isQuestionInProgress = true;
		lastSubmittedQuery = query;
		questionResponse = '';
		questionError = '';

		onask?.();

		try {
			const res = await fetch('/search', {
				method: 'POST',
				headers: { 'Content-Type': 'text/json', 'Accept': 'text/event-stream' },
				body: JSON.stringify({ prompt }),
			});

			if (!res.ok) {
				const json = await res.json().catch(() => null);
				const parsed = AppErrorSchema.safeParse(json);
				questionError =
					parsed.data?.userMessage ?? 'Something went wrong while asking that question.';
				return;
			}

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
			questionError = 'An unknown error occurred during generation.';
		} finally {
			isQuestionInProgress = false;
		}
	};
</script>

{#snippet askButton()}
	<button
		title="Ask Wishii AI"
		class="mb-1 flex items-center gap-2 border-accent p-2 py-1 text-xs text-text"
		disabled={isQuestionInProgress || !query}
		onclick={ask}
		type="button"
	>
		{#if isQuestionInProgress}
			<span class="animate-pulse">Asking...</span>
		{:else}
			<span>Ask</span>

			{#if searchFocused}
				<CornerDownLeftIcon size={12} />
			{/if}
		{/if}
	</button>
{/snippet}

<div role="group" aria-label="AI Assistant">
	<div
		class={`flex items-center gap-2 text-accent ${isQuestionInProgress || shouldPromptToAsk ? 'animate-[color-shift_2s_ease-in-out_infinite]' : ''}`}
	>
		<SparklesIcon size={18} />

		<span class="me-auto">Wishii AI</span>

		{#if !isQueryQuestion}
			{@render askButton()}
		{/if}
	</div>

	{#if isQueryQuestion}
		<div transition:slide={{ duration: 150 }} class="flex items-center gap-2">
			<ArrowDownRight class="shrink-0 animate-pulse text-accent" size={14} />

			<p class="me-auto truncate text-text-muted italic">
				<span class="text-accent">Ask: </span>
				{query}
			</p>

			{@render askButton()}
		</div>
	{/if}

	{#if lastSubmittedQuery}
		<div
			class="my-3 flex items-center gap-2 rounded-r-md border-l-2 border-border-strong bg-muted py-1.5 ps-2 pe-3"
		>
			<MessageCircleQuestionMarkIcon size={14} class="shrink-0 text-text-muted" />
			<p class="text-sm text-text-muted italic">{lastSubmittedQuery}</p>
		</div>
	{/if}

	{#if isQuestionInProgress && !questionResponse}
		<div class="h-12 w-12 pt-2">
			<Loader thickness="2px" pulseDur="1.25s" pulseStaggerDur="250ms" pulseCount={2} />
		</div>
	{:else if questionResponse}
		<div aria-live="polite" class="mt-2">
			<Markdown content={questionResponse} />
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
