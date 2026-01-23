import { inArray, notInArray, sql } from 'drizzle-orm';
import { Ok } from 'ts-results-es';

import { db } from '../db';
import { DocumentationTable } from '../db/schema';
import { createService } from '../util/service';

export const DocsService = createService(db(), {
	/**
	 * Lists content hashes for the given chunk IDs.
	 * Used for deduplication before embedding.
	 *
	 * @param ids the chunk IDs to lookup
	 */
	listHashesByIds: async (client, ids: string[]) => {
		if (ids.length === 0) return Ok([]);

		const results = await client.query.DocumentationTable.findMany({
			where: (t) => inArray(t.id, ids),
			columns: { id: true, contentHash: true },
		});

		return Ok(results);
	},

	/**
	 * Upserts a documentation chunk with its embedding on ID conflict.
	 *
	 * @param data the chunk data to upsert
	 */
	upsertOnId: async (client, data: typeof DocumentationTable.$inferInsert) => {
		const result = await client
			.insert(DocumentationTable)
			.values(data)
			.onConflictDoUpdate({
				target: DocumentationTable.id,
				set: {
					content: data.content,
					contentHash: data.contentHash,
					vector: data.vector,
				},
			});

		return Ok(result.rowsAffected);
	},

	/**
	 * Deletes all chunks except those with the provided IDs.
	 *
	 * @param keepIds the IDs to keep
	 */
	deleteExceptIds: async (client, keepIds: string[]) => {
		const result = await client
			.delete(DocumentationTable)
			.where(notInArray(DocumentationTable.id, keepIds));

		return Ok(result.rowsAffected);
	},

	/**
	 * Queries documentation chunks by vector similarity.
	 *
	 * @param queryVector the embedding vector to search with
	 * @param topK the number of results to return
	 */
	queryDocsByVector: async (client, queryVector: Buffer, topK: number) => {
		const results = await client
			.select({
				id: DocumentationTable.id,
				content: DocumentationTable.content,
			})
			.from(sql`vector_top_k('docs_vector_idx', ${queryVector}, ${topK}) AS vtk`)
			.innerJoin(DocumentationTable, sql`vtk.id = ${DocumentationTable}.rowid`);

		return Ok(results);
	},
});
