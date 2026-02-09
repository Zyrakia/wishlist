import { formatHost } from '$lib/util/url';

import type { LanguageModelUsage } from 'ai';

export function reportGenerationUsage(url: string, usage: LanguageModelUsage) {
	const name = formatHost(url, { subdomain: false, tld: false }) || 'Unknown';
	console.log(`Generation on "${name}" completed with ${usage.totalTokens} tokens.`);
}
