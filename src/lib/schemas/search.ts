import z from 'zod';

export const PromptSchema = z
	.string({ error: 'Prompt is required' })
	.trim()
	.toLowerCase()
	.min(1, { error: 'Too short!' })
	.max(512, { error: 'Too long!' });

export interface SearchResults {
	mutual: { name: string; userId: string };
	reservation: {
		name: string;
		notes: string;
		itemId: string;
		ownerName: string;
		wishlistSlug: string;
	};
	list: { name: string; description: string; slug: string };
	group: { name: string; id: string };
}

export type SearchResult = {
	[K in keyof SearchResults]: { kind: K; entity: SearchResults[K] };
}[keyof SearchResults];
