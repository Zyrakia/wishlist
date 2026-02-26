import { createHash } from 'crypto';
import { type Dirent, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Embedding } from 'ai';

import { DocsService } from '../src/lib/server/services/search/docs';
import { EMBEDDING_MAX_INPUT, EmbeddingService } from '../src/lib/server/services/embedding';
import { unwrap } from '../src/lib/server/util/service';

const DOCS_ROOT = join(process.cwd(), 'docs');
const CHUNK_DELIM = '##';

type DocumentChunk = {
	id: string;
	origin: Dirent;
	title: string;
	content: string;
	hash: string;
};

type EmbeddedChunk = DocumentChunk & {
	embedding: Embedding;
};

const slugify = (s: string) => s.toLowerCase().replaceAll(/\s+/g, '-');

function generateId(origin: Dirent, title: string) {
	return `${slugify(origin.name)}:${slugify(title)}`;
}

function chunkDocument(file: Dirent) {
	if (!file.isFile()) return;

	const absolutePath = join(file.parentPath, file.name);
	const content = readFileSync(absolutePath, { encoding: 'utf-8' });

	return content.split(CHUNK_DELIM).flatMap((v, i): DocumentChunk[] => {
		const lines = v.split('\n').map((v) => v.trim());
		const [title, ...content] = lines;

		if (!title || !content.length) {
			if (i === 0) return [];
			throw `Empty chunk ${file.name}#${i}`;
		}

		const chunk = lines.join('\n');
		if (chunk.length > EMBEDDING_MAX_INPUT) {
			throw `Chunk ${file.name}@${title} above embedding limit (${chunk.length}/${EMBEDDING_MAX_INPUT}).`;
		}

		return [
			{
				id: generateId(file, title),
				title,
				content: chunk,
				hash: createHash('sha256').update(chunk).digest('hex'),
				origin: file,
			},
		];
	});
}

async function embedChunks(chunks: DocumentChunk[]) {
	if (chunks.length === 0) return [];

	const embeddings = unwrap(await EmbeddingService.generateMany(chunks.map((v) => v.content)));

	return embeddings.map((embedding, i): EmbeddedChunk => {
		const chunk = chunks[i];
		if (!chunk) {
			throw `Embedding -> Chunk mismatch on index ${i}. ${embeddings.length} embeddings, ${chunks.length} chunks.`;
		}

		return { ...chunk, embedding };
	});
}

async function insertChunks(chunks: EmbeddedChunk[]) {
	let inserted = 0;

	await Promise.all(
		chunks.map(async (chunk) => {
			const rowsAffected = unwrap(
				await DocsService.upsertOnId({
					id: chunk.id,
					content: chunk.content,
					contentHash: chunk.hash,
					vector: chunk.embedding,
				}),
			);

			inserted += rowsAffected;
		}),
	);

	return inserted;
}

async function dedupeChunks(chunks: DocumentChunk[]) {
	const existingHashes = unwrap(await DocsService.listHashesByIds(chunks.map((c) => c.id)));
	const hashMap = new Map(existingHashes.map((h) => [h.id, h.contentHash]));

	return chunks.filter((chunk) => hashMap.get(chunk.id) !== chunk.hash);
}

async function main() {
	const entries = readdirSync(DOCS_ROOT, { withFileTypes: true, recursive: true });

	const chunks = entries.flatMap((entry) => {
		if (!entry.isFile()) return [];
		return chunkDocument(entry) || [];
	});

	const chunksWithEmbedding = await embedChunks(await dedupeChunks(chunks));
	const inserted = await insertChunks(chunksWithEmbedding);
	const deleted = unwrap(await DocsService.deleteExceptIds(chunks.map((v) => v.id)));

	console.log(`${inserted} chunks inserted, ${deleted} removed.`);
}

main();
