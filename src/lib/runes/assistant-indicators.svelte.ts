/**
 * Global registry for assistant control indicators.
 *
 * Allows components to:
 * 1. Suggest prompts to display in the search bar (e.g., "Explain my form errors")
 * 2. Provide context to include with AI questions (with caveat that it may not be relevant)
 *
 * Usage:
 * ```ts
 * // In a form component - register on mount, auto-cleanup on unmount
 * $effect(() => {
 *   if (formErrors.length === 0) return;
 *
 *   return assistantIndicator('my-form', {
 *     suggestedPrompt: { prompt: 'Explain my form errors', priority: 10 },
 *     context: `Form errors: ${formErrors.join(', ')}`,
 *   });
 * });
 *
 * // Or manually control lifecycle
 * const cleanup = assistantIndicator('my-component', { ... });
 * // Later: cleanup();
 * ```
 */

import { SvelteMap } from 'svelte/reactivity';

export interface PromptIndicator {
	/** The prompt text to suggest */
	prompt: string;
	/** Priority for display - higher wins (default: 0) */
	priority?: number;
	/** Optional color override for the search bar (CSS variable or color value) */
	color?: string;
}

export interface AssistantIndicator {
	/** Suggested prompt to show in search bar */
	suggestedPrompt?: PromptIndicator;
	/** Context to include with questions (assistant is told this may not be relevant) */
	context?: string | string[];
}

const indicators = new SvelteMap<string, AssistantIndicator>();

/**
 * Register an indicator. Returns a cleanup function.
 * The cleanup function is idempotent and safe to call multiple times.
 */
export function assistantIndicator(id: string, indicator: AssistantIndicator) {
	indicators.set(id, indicator);

	let cleaned = false;
	return () => {
		if (cleaned) return;
		cleaned = true;
		indicators.delete(id);
	};
}

/**
 * Update an existing indicator. No-op if the indicator doesn't exist.
 */
export function updateIndicator(id: string, updates: Partial<AssistantIndicator>) {
	const existing = indicators.get(id);
	if (!existing) return;
	indicators.set(id, { ...existing, ...updates });
}

/**
 * Get the highest priority suggested prompt, if any.
 */
export const getSuggestedPrompt = () => {
	let best: PromptIndicator | undefined;

	for (const indicator of indicators.values()) {
		if (!indicator.suggestedPrompt) continue;

		const priority = indicator.suggestedPrompt.priority ?? 0;
		if (!best || best.priority === undefined || priority > best.priority) {
			best = { ...indicator.suggestedPrompt, priority };
		}
	}

	return best;
};

/**
 * Get all context strings combined, or undefined if none.
 */
export const getAssistantContext = () => {
	const contexts: string[] = [];

	for (const indicator of indicators.values()) {
		if (!indicator.context) continue;

		const contextLines = Array.isArray(indicator.context)
			? indicator.context
			: [indicator.context];

		contexts.push(contextLines.filter((v) => !!v).join('\n'));
	}

	if (contexts.length === 0) return;

	return contexts.join('\n\n');
};

/**
 * Check if there are any active indicators.
 */
export const hasIndicators = () => {
	return indicators.size > 0;
};
