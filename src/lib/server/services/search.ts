import ENV from '$lib/env';
import { PromptSchema } from '$lib/schemas/search';
import { createMistral } from '@ai-sdk/mistral';
import { streamText } from 'ai';
import { Err, Ok, Result } from 'ts-results-es';

import SYSTEM_PROMPT from '$lib/assets/assistant-system-prompt.txt?raw';
import { db, type DatabaseClient } from '../db';
import { createService, DomainError, unwrap } from '../util/service';
import { EmbeddingService } from './embedding';
import { DocsService } from './docs';
import { GroupsService } from './groups';

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });
const MAX_OUTPUT_TOKENS = 1024;

const DOC_CHUNKS = 5;

interface SearchResults {
	mutual: {name: string; userId: string; groupId: string;}
	reservation: {name: string; notes: string; itemId: string; wishlistSlug: string;}
	list: {name: string; description: string; id: string;}
}

export type SearchResult = {[K in keyof SearchResults]: {kind: K, entity: SearchResults[K]}}[keyof SearchResults]

const searchMutuals = async (client: DatabaseClient, query: string, queryUserId: string): Promise<SearchResults['mutual'][]> => {
	const groupsRes = await GroupsService.$with(client).listByUserId(queryUserId);
	if (!groupsRes.isOk()) {
		console.warn(groupsRes.error);
		return [];
	}

	const groups = groupsRes.value;
	const groupIds = groupsRes.value.map((v) => v.groupId)

	// TODO Query

	return []
}

const searchReservations = async (client: DatabaseClient, query: string, queryUserId: string): Promise<SearchResults['reservation'][]> => {
	// TODO query

	return []
}

const searchLists = async (client: DatabaseClient, query: string, queryUserId: string): Promise<SearchResults['list'][]> => {
	// TODO query

	return []
}

export const SearchService = createService(db(), {
	/**
	 * Streams an AI-generated answer based on documentation search prompt.
	 *
	 * @param dirtyPrompt the user's prompt
	 */
	streamDocsAnswer: async (_client, dirtyPrompt: string) => {
		const { success, data: userPrompt } = PromptSchema.safeParse(dirtyPrompt);
		if (!success) {
			return Err(DomainError.of("I don't understand that kind of question..."));
		}

		const embeddedPrompt = unwrap(await EmbeddingService.generate(userPrompt));
		const promptVector = unwrap(await EmbeddingService.toBuffer(embeddedPrompt));
		const relevantDocChunks = unwrap(
			await DocsService.queryDocsByVector(promptVector, DOC_CHUNKS),
		);

		if (relevantDocChunks.length === 0) {
			return Err(
				DomainError.of("I couldn't find information about that, can you try rewording it?"),
			);
		}

		const joinedDocChunks = relevantDocChunks
			.map((v, i, arr) => {
				const mostRelevant = arr.length;
				const relativeRelevancy = mostRelevant - i;
				return `Documentation Chunck ${i + 1} (${relativeRelevancy}/${mostRelevant} ~relevancy):\n${v.content}`;
			})
			.join('\n\n');

		const sysPromptWithDocs =
			SYSTEM_PROMPT +
			`\n\n---\nPotentially relevant snippets from documentation:\n${joinedDocChunks}`;

		const stream = streamText({
			model: modelHost('mistral-small-latest'),
			maxOutputTokens: MAX_OUTPUT_TOKENS,
			messages: [
				{ role: 'system', content: sysPromptWithDocs },
				{ role: 'user', content: userPrompt },
			],
		});

		return Ok(stream);
	},

	search: async (client, dirtyQuery: string) => {
		// TODO validate query
		// TODO aggregate searches, join needed information
		// return in ordered list Mutuals -> Lists -> Reservations
		return Ok([])
	}
});
