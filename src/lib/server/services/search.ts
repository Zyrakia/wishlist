import ENV from '$lib/env';
import { QuestionSchema } from '$lib/schemas/search';
import { createMistral } from '@ai-sdk/mistral';
import { streamText, type UserModelMessage } from 'ai';
import { sql } from 'drizzle-orm';
import { Err, Ok } from 'ts-results-es';

import SYSTEM_PROMPT from '$lib/assets/docs-system-prompt.txt?raw';
import { db } from '../db';
import { DocumentationTable } from '../db/schema';
import { createService, DomainError, unwrap } from '../util/service';
import { EmbeddingService } from './embedding';
import { DocsService } from './docs';

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });
const MAX_OUTPUT_TOKENS = 1024;

const DOC_CHUNKS = 5;

export const SearchService = createService(db(), {
	/**
	 * Streams an AI-generated answer based on documentation search.
	 *
	 * @param dirtyQuestion the user's question (will be validated)
	 * @param context additional context messages
	 */
	streamDocsAnswer: async (_client, dirtyQuestion: string, context: string[] = []) => {
		const { success, data: question } = QuestionSchema.safeParse(dirtyQuestion);
		if (!success) {
			return Err(DomainError.of("I don't understand that kind of question..."));
		}

		const embeddedQuestion = unwrap(await EmbeddingService.generate(question));
		const questionVector = unwrap(await EmbeddingService.toBuffer(embeddedQuestion));
		const relevantChunks = unwrap(
			await DocsService.queryDocsByVector(questionVector, DOC_CHUNKS),
		);

		if (relevantChunks.length === 0) {
			return Err(
				DomainError.of("I couldn't find information about that, can you try rewording it?"),
			);
		}

		const joinedChunks = relevantChunks.map((v) => v.content).join('\n\n');
		const joinedContext = context.map((v) => `- ${v}`).join('\n');

		const systemPromptWithContext =
			SYSTEM_PROMPT +
			`\n\nPotentially relevant snippets from documentation:\n---\n${joinedChunks}`;

		const userPrompt = `Question: ${question}` + (context.length > 0 ? joinedContext : '');

		const stream = streamText({
			model: modelHost('mistral-small-latest'),
			maxOutputTokens: MAX_OUTPUT_TOKENS,
			messages: [
				{ role: 'system', content: systemPromptWithContext },
				...context.map((content): UserModelMessage => ({ role: 'user', content })),
				{ role: 'user', content: userPrompt },
			],
		});

		return Ok(stream);
	},
});
