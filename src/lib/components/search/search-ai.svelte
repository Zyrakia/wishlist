<script lang="ts">
	import {
		ArrowDownRight,
		ChevronDownIcon,
		ChevronUpIcon,
		CornerDownLeftIcon,
		MessageCircleQuestionMarkIcon,
		SparklesIcon,
	} from '@lucide/svelte';
	import Loader from '../loader.svelte';
	import Markdown from '../markdown.svelte';
	import { fly, slide } from 'svelte/transition';
	import { getAssistantContext } from '$lib/runes/assistant-indicators.svelte';

	interface Props {
		query: string;
		searchFocused: boolean;
		active?: boolean;
		onactivate?: () => void;
		onask?: () => void;
		promptToAsk?: boolean;
		loading?: boolean;
	}

	let {
		query,
		searchFocused,
		active = false,
		onactivate,
		onask,
		promptToAsk: promptToAskHint = false,
		loading = $bindable(false),
	}: Props = $props();

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
		'explain',
	]);

	const queryWords = $derived(query.toLowerCase().split(' '));
	const isQueryQuestion = $derived.by(() => {
		if (query.endsWith('?')) return true;
		if (queryWords.length < 2) return false;
		return questionWords.has(queryWords[0]);
	});

	let isQuestionInProgress = $state(false);
	let lastSubmission = $state('');
	let questionResponse = $state('');
	let questionError = $state('');

	let isAnswerExpanded = $state(false);
	$effect(() => void (isAnswerExpanded = active));

	const promptToAsk = $derived(!!query && (isQueryQuestion || promptToAskHint));
	const askButtonEnabled = $derived(!isQuestionInProgress && (!active || !!query));

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

	const handleAskButtonClick = () => {
		if (!active) {
			if (!promptToAsk || !query) {
				onactivate?.();
				return;
			}
		}

		void ask();
	};

	export const ask = async () => {
		if (isQuestionInProgress) return;
		const rawPrompt = getQueryAsPrompt();
		if (!rawPrompt) return;

		onactivate?.();

		isQuestionInProgress = true;
		lastSubmission = query;
		questionResponse = '';
		questionError = '';

		onask?.();

		try {
			const res = await fetch('/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
				body: JSON.stringify({ prompt: rawPrompt }),
			});

			if (!res.ok) {
				questionError =
					(await res.text()) || 'Something went wrong while asking that question.';

				return;
			}

			const reader = res.body?.getReader();
			if (!reader) throw new Error('No reader obtained from search response stream');

			const decoder = new TextDecoder();

			let chunk: ReadableStreamReadResult<Uint8Array<ArrayBuffer>>;
			while ((chunk = await reader.read()) && !chunk.done) {
				questionResponse += decoder.decode(chunk.value, { stream: true });
			}

			questionResponse += decoder.decode();
		} catch (err) {
			console.warn(err);
			questionError = 'An unknown error occurred during generation.';
		} finally {
			isQuestionInProgress = false;
		}
	};

	$effect(() => {
		loading = isQuestionInProgress;
	});
</script>

{#snippet askButton()}
	<button
		title={active ? 'Ask Wishii AI' : 'Enter Ask Mode'}
		class="mb-1 flex items-center gap-2 border-accent p-2 py-1 text-xs text-text"
		disabled={!askButtonEnabled}
		onmousedown={(e) => e.preventDefault()}
		onclick={handleAskButtonClick}
		type="button"
	>
		{#if isQuestionInProgress}
			<span class="animate-pulse">Asking...</span>
		{:else}
			<span>{active || isQueryQuestion ? 'Ask' : 'Enter Ask Mode'}</span>

			{#if searchFocused && active}
				<CornerDownLeftIcon size={12} />
			{/if}
		{/if}
	</button>
{/snippet}

<div role="group" aria-label="AI Assistant">
	<div class={`flex items-center gap-2 text-accent`}>
		<SparklesIcon size={18} />

		<span class="me-auto">Wishii AI</span>

		{#if !promptToAsk}
			{@render askButton()}
		{/if}
	</div>

	{#if promptToAsk}
		<div transition:slide={{ duration: 150 }} class="flex items-center gap-2">
			<ArrowDownRight class="shrink-0 animate-pulse text-accent" size={14} />

			<p class="me-auto truncate text-text-muted italic">
				<span class="text-accent">Ask: </span>
				{query}
			</p>

			{@render askButton()}
		</div>
	{/if}

	{#if lastSubmission}
		<div
			class="my-3 flex items-center gap-2 rounded-r-md border-l-2 border-border-strong bg-muted py-1.5 ps-2 pe-3"
		>
			<MessageCircleQuestionMarkIcon size={14} class="shrink-0 text-text-muted" />

			<p class="truncate text-sm text-text-muted italic">{lastSubmission}</p>

			<button
				class="absolute right-5 m-0 border-0 p-0"
				onclick={() => (isAnswerExpanded = !isAnswerExpanded)}
			>
				{#if isAnswerExpanded}
					<ChevronUpIcon size={18} />
				{:else}
					<ChevronDownIcon size={18} />
				{/if}
			</button>
		</div>
	{/if}

	{#if isQuestionInProgress && !questionResponse}
		<div class="h-12 w-12 pt-2">
			<Loader thickness="2px" pulseDur="1.25s" pulseStaggerDur="250ms" pulseCount={2} />
		</div>
	{:else if questionResponse}
		{#if isAnswerExpanded}
			<div aria-live="polite" class="mt-2" title="Generated Response">
				<Markdown content={questionResponse} />
			</div>
		{/if}
	{:else if questionError}
		<p class="mt-2 text-danger/75 italic">{questionError}</p>
	{/if}
</div>
