import { touchList } from '$lib/remotes/wishlist.remote';
import { ItemSchema } from '$lib/schemas/item';
import { formatRelative } from '$lib/util/date';
import { type Result, wrapSafeAsync } from '$lib/util/safe-call';
import { safePrune } from '$lib/util/safe-prune';
import { randomUUID } from 'crypto';
import { and, eq, notInArray } from 'drizzle-orm';
import ms from 'ms';

import { error } from '@sveltejs/kit';

import { db } from '../db';
import { WishlistConnectionTable, WishlistItemTable } from '../db/schema';
import { buildUpsertSet } from '../util/drizzle';
import { generateItemCandidates } from './item-generator';

const SYNC_DELAY = ms('1h');

const normalizeCompareUrl = (raw: string) => {
	try {
		const url = new URL(raw);
		return `${url.protocol}//${url.host}/${url.pathname}`;
	} catch {
		return raw;
	}
};

const syncing = new Map<string, Promise<Result<void>>>();
const _syncListConnection = wrapSafeAsync(async (connectionId: string) => {
	const connection = await db().query.WishlistConnectionTable.findFirst({
		where: (t, { eq }) => eq(t.id, connectionId),
		with: { createdGeolocation: true, items: { columns: { id: true, url: true } } },
	});

	if (!connection) error(400, 'Invalid connection');

	const now = new Date();
	if (connection.lastSyncedAt && now.getTime() - connection.lastSyncedAt.getTime() < SYNC_DELAY) {
		const nextSync = new Date(connection.lastSyncedAt.getTime() + SYNC_DELAY);
		throw `Next sync ${formatRelative(nextSync)}`;
	}

	const {
		data: candidates,
		success: generationSuccess,
		error: generationError,
	} = await generateItemCandidates(connection.url, connection.createdGeolocation || undefined);

	if (!generationSuccess) {
		await db()
			.update(WishlistConnectionTable)
			.set({ syncError: true })
			.where(eq(WishlistConnectionTable.id, connectionId));

		throw generationError;
	}

	const existingItems = connection.items;
	const urlToId = new Map(
		existingItems.map((v) => [v.url ? normalizeCompareUrl(v.url) : null, v.id]),
	);

	console.log(urlToId);

	const items = (candidates || []).flatMap((candidate) => {
		if (!candidate.name || !candidate.valid) return [];

		const data = safePrune(ItemSchema, candidate);
		const existingId = data.url ? urlToId.get(normalizeCompareUrl(data.url)) : undefined;

		return [
			{
				id: existingId || randomUUID(),
				wishlistId: connection.wishlistId,
				connectionId: connection.id,
				...data,
				name: data.name || 'No Product Name',
				notes: data.notes || '',
			},
		];
	});

	if (!items.length && !connection.lastSyncedAt) {
		await db()
			.update(WishlistConnectionTable)
			.set({ syncError: true })
			.where(eq(WishlistConnectionTable.id, connectionId));
		throw 'Cannot find any items, is the list private?';
	}

	await db().transaction(async (tx) => {
		await tx
			.update(WishlistConnectionTable)
			.set({ lastSyncedAt: new Date(), syncError: false })
			.where(eq(WishlistConnectionTable.id, connectionId));

		if (items.length === 0) {
			await tx
				.delete(WishlistItemTable)
				.where(eq(WishlistItemTable.connectionId, connectionId));
		} else {
			const activeIds = items.map((v) => v.id);
			await tx
				.delete(WishlistItemTable)
				.where(
					and(
						eq(WishlistItemTable.connectionId, connectionId),
						notInArray(WishlistItemTable.id, activeIds),
					),
				);

			await tx
				.insert(WishlistItemTable)
				.values(items)
				.onConflictDoUpdate({
					target: WishlistItemTable.id,
					set: buildUpsertSet(
						WishlistItemTable,
						'name',
						'price',
						'priceCurrency',
						'imageUrl',
						'url',
					),
				});
		}
	});

	await touchList({ id: connection.wishlistId }).catch(() => {});
});

export const syncListConnection = (connectionId: string) => {
	const runningSync = syncing.get(connectionId);
	if (runningSync) return runningSync;

	const sync = _syncListConnection(connectionId).finally(() => {
		syncing.delete(connectionId);
	});

	syncing.set(connectionId, sync);
	return sync;
};
