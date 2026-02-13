import ENV from '$lib/env';
import { PromptSchema, type SearchResult } from '$lib/schemas/search';
import { createMistral } from '@ai-sdk/mistral';
import { streamText } from 'ai';
import { Err, Ok } from 'ts-results-es';

import SYSTEM_PROMPT from '$lib/assets/assistant-system-prompt.txt?raw';
import { db } from '../../db';
import { createService, DomainError, unwrap } from '../../util/service';
import { EmbeddingService } from '../embedding';
import { DocsService } from './docs';
import { FtsService } from './fts';

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });
const MAX_OUTPUT_TOKENS = 1024;

const DOC_CHUNKS = 5;

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

	searchAsUser: async (client, query: string, userId: string) => {
		const fts = FtsService.$with(client);

		const ftsQuery = unwrap(await fts.createPrefixQuery(query));

		const [mutuals, groups, lists, reservations] = await Promise.all([
			fts.findMutualsAsUser(userId, ftsQuery),
			fts.findGroupsAsUser(userId, ftsQuery),
			fts.findListsAsUser(userId, ftsQuery),
			fts.findReservationsAsUser(userId, ftsQuery),
		]);

		return Ok([
			...unwrap(mutuals).map((entity): SearchResult => ({ kind: 'mutual', entity })),
			...unwrap(groups).map((entity): SearchResult => ({ kind: 'group', entity })),
			...unwrap(lists).map((entity): SearchResult => ({ kind: 'list', entity })),
			...unwrap(reservations).map(
				(entity): SearchResult => ({ kind: 'reservation', entity }),
			),
		]);
	},
});
