import { wrapSafeAsync, type Result } from '$lib/util/safe-call';
import { error } from '@sveltejs/kit';
import { db } from '../db';
import ms from 'ms';
import { formatRelative } from '$lib/util/date';
import { generateItemCandidates } from './item-generator';
import { ItemSchema } from '$lib/schemas/item';
import { randomUUID } from 'crypto';
import { WishlistConnectionTable, WishlistItemTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { touchList } from '$lib/remotes/wishlist.remote';
import { safePrune } from '$lib/util/safe-prune';

const SYNC_DELAY = ms('1h');

const syncing = new Map<string, Promise<Result<void>>>();
const _syncListConnection = wrapSafeAsync(async (connectionId: string) => {
	const connection = await db().query.WishlistConnectionTable.findFirst({
		where: (t, { eq }) => eq(t.id, connectionId),
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
	} = await generateItemCandidates(connection.url);

	if (!generationSuccess) {
		await db()
			.update(WishlistConnectionTable)
			.set({ syncError: true })
			.where(eq(WishlistConnectionTable, connectionId));
		throw generationError;
	}

	const items = (candidates || []).flatMap((candidate) => {
		if (!candidate.name || !candidate.valid) return [];

		const data = safePrune(ItemSchema, candidate);
		return [
			{
				id: randomUUID(),
				wishlistId: connection.wishlistId,
				connectionId: connection.id,
				name: data.name || 'No Product Name',
				notes: data.notes || '',
				...data,
			},
		];
	});

	if (!items.length && !connection.lastSyncedAt) {
		await db()
			.update(WishlistConnectionTable)
			.set({ syncError: true })
			.where(eq(WishlistConnectionTable, connectionId));
		throw 'Cannot find any items, is the list private?';
	}

	db().transaction((tx) => {
		tx.update(WishlistConnectionTable)
			.set({ lastSyncedAt: now, syncError: false })
			.where(eq(WishlistConnectionTable.id, connectionId))
			.run();

		tx.delete(WishlistItemTable).where(eq(WishlistItemTable.connectionId, connectionId)).run();

		if (items.length) tx.insert(WishlistItemTable).values(items).run();
	});

	touchList({ id: connection.wishlistId });
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
