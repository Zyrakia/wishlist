import { createHash } from 'crypto';
import { Dirent, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Embedding, embedMany } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import { db } from '../src/lib/server/db';
import ENV from '../src/lib/env';
import { DocumentationTable } from '../src/lib/server/db/schema';
import { notInArray } from 'drizzle-orm';

const DOCS_ROOT = join(process.cwd(), 'docs');
const CHUNCK_DELIM = '##';
const CHUNCK_LIMIT = 8192;

type DocumentChunck = {
	id: string;
	origin: Dirent;
	title: string;
	content: string;
	hash: string;
};

type EmbeddedChunck = DocumentChunck & {
	embedding: Embedding;
};

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });
const embeddingModel = modelHost.textEmbedding('mistral-embed');

const slugify = (s: string) => s.toLowerCase().replaceAll(/\s+/g, '-');
function generateId(origin: Dirent, title: string) {
	return `${slugify(origin.name)}:${slugify(title)}`;
}

function chunckDocument(file: Dirent) {
	if (!file.isFile()) return;

	const absolutePath = join(file.parentPath, file.name);
	const content = readFileSync(absolutePath, { encoding: 'utf-8' });

	return content.split(CHUNCK_DELIM).flatMap((v, i): DocumentChunck[] => {
		const lines = v.split('\n').map((v) => v.trim());
		const [title, ...content] = lines;

		if (!title || !content.length) {
			if (i === 0) return [];
			throw `Empty chunck ${file.name}#${i}`;
		}

		const chunck = lines.join('\n');
		if (chunck.length >= CHUNCK_LIMIT) {
			throw `Chunck ${file.name}@${title} above chunck limit (${chunck.length}/${CHUNCK_LIMIT}).`;
		}

		return [
			{
				id: generateId(file, title),
				title,
				content: chunck,
				hash: createHash('sha256').update(chunck).digest('hex'),
				origin: file,
			},
		];
	});
}

async function embedChuncks(chuncks: DocumentChunck[]) {
	if (chuncks.length === 0) return [];

	const { embeddings } = await embedMany({
		model: embeddingModel,
		values: chuncks.map((v) => v.content),
	});

	return embeddings.map((v, i): EmbeddedChunck => {
		const chunck = chuncks[i];
		if (!chunck)
			throw `Embedding -> Chunck Mismatch on index ${i}. ${embeddings.length} embeddings, ${chuncks.length} chuncks.`;

		return {
			...chunck,
			embedding: v,
		};
	});
}

async function insertChuncks(chuncks: EmbeddedChunck[]) {
	let inserted = 0;

	await Promise.all(
		chuncks.map(async (chunck) => {
			const insertRes = await db()
				.insert(DocumentationTable)
				.values({
					id: chunck.id,
					content: chunck.content,
					contentHash: chunck.hash,
					vector: chunck.embedding,
				})
				.onConflictDoUpdate({
					target: DocumentationTable.id,
					set: {
						content: chunck.content,
						contentHash: chunck.hash,
						vector: chunck.embedding,
					},
				});

			inserted += insertRes.rowsAffected;
		}),
	);

	return inserted;
}

async function deleteStaleChuncks(nonStaleIds: string[]) {
	const res = await db()
		.delete(DocumentationTable)
		.where(notInArray(DocumentationTable.id, nonStaleIds));

	return res.rowsAffected;
}

async function dedupeChuncks(chuncks: DocumentChunck[]) {
	const deduped: DocumentChunck[] = [];

	for (const chunck of chuncks) {
		const existing = await db().query.DocumentationTable.findFirst({
			where: (t, { eq }) => eq(t.id, chunck.id),
			columns: { contentHash: true },
		});

		if (existing && existing.contentHash === chunck.hash) continue;
		else deduped.push(chunck);
	}

	return deduped;
}

async function main() {
	const entries = readdirSync(DOCS_ROOT, { withFileTypes: true, recursive: true });

	const chuncks = entries.flatMap((entry) => {
		if (!entry.isFile()) return [];
		return chunckDocument(entry) || [];
	});

	const chuncksWithEmbedding = await embedChuncks(await dedupeChuncks(chuncks));
	const inserted = await insertChuncks(chuncksWithEmbedding);
	const deleted = await deleteStaleChuncks(chuncks.map((v) => v.id));

	console.log(`${inserted} chuncks inserted, ${deleted} removed.`);
}

main();
