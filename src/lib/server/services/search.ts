import ENV from '$lib/env';
import { PromptSchema, type SearchResult, type SearchResults } from '$lib/schemas/search';
import { createMistral } from '@ai-sdk/mistral';
import { streamText } from 'ai';
import { Err, Ok } from 'ts-results-es';

import SYSTEM_PROMPT from '$lib/assets/assistant-system-prompt.txt?raw';
import { db, type DatabaseClient } from '../db';
import { createService, DomainError, unwrap } from '../util/service';
import { EmbeddingService } from './embedding';
import { DocsService } from './docs';
import { GroupsService } from './groups';
import { sql } from 'drizzle-orm';
import { WishlistItemTable, WishlistTable } from '../db/schema';

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });
const MAX_OUTPUT_TOKENS = 1024;

const DOC_CHUNKS = 5;

const MutualsTable = sql`mutuals_fts`;
const ReservationsTable = sql`reservations_fts`;
const ListsTable = sql`lists_fts`;

const toFtsPrefixQuery = (query: string) => {
	const sanitized = query.trim().replace(/"/g, '');
	return `"${sanitized}"*`;
};

const searchMutuals = async (client: DatabaseClient, ftsQuery: string, queryUserId: string) => {
	const groups = unwrap(await GroupsService.$with(client).listByUserId(queryUserId));
	if (groups.length === 0) return [];

	const groupIds = groups.map((v) => v.groupId);

	// Find people in shared groups
	// Returns one result per user (selects one group ID if in multiple)

	type Result = SearchResults['mutual'];

	return await client.all<Result>(sql`
	SELECT ${MutualsTable}.name, ${MutualsTable}.user_id as userId, ${MutualsTable}.group_id as groupId
	FROM ${MutualsTable}
	WHERE ${MutualsTable}.group_id IN ${groupIds}
		AND ${MutualsTable}.user_id <> ${queryUserId}
		AND ${MutualsTable}.name MATCH ${ftsQuery}
	GROUP BY ${MutualsTable}.user_id
	ORDER BY MIN(${MutualsTable}.rank)`);
};

const searchReservations = async (
	client: DatabaseClient,
	ftsQuery: string,
	queryUserId: string,
) => {
	// Find items user as reserved
	// Joins slug to allow navigation to list
	// Matches either name or notes (matches against table not column)

	type Result = SearchResults['reservation'];

	return await client.all<Result>(sql`
	SELECT ${ReservationsTable}.name, ${ReservationsTable}.notes, ${ReservationsTable}.item_id as itemId, ${WishlistTable.slug} as wishlistSlug
	FROM ${ReservationsTable}
	INNER JOIN ${WishlistItemTable} ON ${WishlistItemTable.id} = ${ReservationsTable}.item_id
	INNER JOIN ${WishlistTable} ON ${WishlistTable.id} = ${WishlistItemTable.wishlistId}
	WHERE ${ReservationsTable}.user_id = ${queryUserId}
		AND ${ReservationsTable} MATCH ${ftsQuery}
	ORDER BY ${ReservationsTable}.rank`);
};

const searchLists = async (client: DatabaseClient, ftsQuery: string, queryUserId: string) => {
	// Finds lists a user has made
	// Lists FTS table is content backed by wishlist table, can join on rowid
	// Matches either name or description (matches against table not column)

	type Result = SearchResults['list'];

	return await client.all<Result>(sql`
	SELECT ${ListsTable}.name, ${ListsTable}.description, ${WishlistTable.slug}
	FROM ${ListsTable}
	INNER JOIN ${WishlistTable} ON ${WishlistTable}.rowid = ${ListsTable}.rowid
	WHERE ${WishlistTable.userId} = ${queryUserId}
		AND ${ListsTable} MATCH ${ftsQuery}
	ORDER BY ${ListsTable}.rank`);
};

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

	searchAsUser: async (client, dirtyQuery: string, queryUserId: string) => {
		const { success, data: query } = PromptSchema.safeParse(dirtyQuery);
		if (!success) return Err(DomainError.of('Invalid search query'));
		if (!queryUserId.trim()) return Err(DomainError.of('Missing query user id'));

		const ftsQuery = toFtsPrefixQuery(query);

		const [mutuals, lists, reservations] = await Promise.all([
			searchMutuals(client, ftsQuery, queryUserId),
			searchLists(client, ftsQuery, queryUserId),
			searchReservations(client, ftsQuery, queryUserId),
		]);

		return Ok<SearchResult[]>([
			...mutuals.map((entity) => ({ kind: 'mutual', entity }) as const),
			...lists.map((entity) => ({ kind: 'list', entity }) as const),
			...reservations.map((entity) => ({ kind: 'reservation', entity }) as const),
		]);
	},
});
