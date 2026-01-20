import ENV from '$lib/env';
import { createMistral } from '@ai-sdk/mistral';
import { embed } from 'ai';
import { db } from './db';
import { DocumentationTable } from './db/schema';
import { sql } from 'drizzle-orm';

// TODO create central embedding service
const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });
const embeddingModel = modelHost.textEmbedding('mistral-embed');

export async function queryDocumentationChuncks(query: string, topK = 5) {
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
