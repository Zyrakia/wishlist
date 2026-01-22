import ENV from '$lib/env';
import { createMistral } from '@ai-sdk/mistral';
import {
	embed,
	streamText,
	type UserModelMessage,
} from 'ai';
import { db } from './db';
import { DocumentationTable } from './db/schema';
import { sql } from 'drizzle-orm';
import { QuestionSchema } from '$lib/schemas/search';
import SYSTEM_PROMPT from '$lib/assets/docs-system-prompt.txt?raw';

const MAX_OUTPUT_TOKENS = 1024;

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });
const embeddingModel = modelHost.textEmbedding('mistral-embed');

async function queryDocumentationChuncks(query: string, topK = 5) {
	const { embedding } = await embed({
		model: embeddingModel,
		value: query,
	});

	const queryVector = Buffer.from(new Float32Array(embedding).buffer);

	const results = await db()
		.select({
			id: DocumentationTable.id,
			content: DocumentationTable.content,
		})
		.from(sql`vector_top_k('docs_vector_idx', ${queryVector}, ${topK}) AS vtk`)
		.innerJoin(DocumentationTable, sql`vtk.id = ${DocumentationTable}.rowid`);

	return results;
}

export async function streamDocumentationAnswer(dirtyQuestion: string, messages: string[] = []) {
	const { success, data: cleanQuestion } = QuestionSchema.safeParse(dirtyQuestion);
	if (!success) return;

	const relevantChuncks = await queryDocumentationChuncks(cleanQuestion);
	if (relevantChuncks.length === 0) return;

	const joinedChuncks = relevantChuncks.map((v) => v.content).join('\n\n');
	const joinedMessages = messages.map((v) => `- ${v}`).join('\n');

	const systemPromptWithContext =
		SYSTEM_PROMPT +
		`\n\Potentially relevant snippets from documentation:\n---\n${joinedChuncks}`;

	const userPrompt = `Question: ${cleanQuestion}` + (messages.length > 0 ? joinedMessages : '');

	return streamText({
		model: modelHost('mistral-small-latest'),
		maxOutputTokens: MAX_OUTPUT_TOKENS,
		messages: [
			{ role: 'system', content: systemPromptWithContext },
			...messages.map((content): UserModelMessage => ({ role: 'user', content })),
			{ role: 'user', content: userPrompt },
		],
	});
}
