import { cleanBaseName } from '$lib/util/url';

import type { LanguageModelUsage } from 'ai';

export function reportGenerationUsage(url: string, usage: LanguageModelUsage) {
	const name = cleanBaseName(url);
	console.log(`Generation on "${name}" completed with ${usage.totalTokens} tokens.`);
}
