import { ItemSchema } from '$lib/schemas/item';
import { $fail, $invalid, $ok, $unwrap, type Result } from '$lib/util/result';
import { safePrune } from '$lib/util/safe-prune';
import { randomUUID } from 'crypto';
import ms from 'ms';

import { db } from '../db';
import { ConnectionsService } from '../services/connections';
import { ItemsService } from '../services/items';
import { generateItemCandidates } from './item-generator';
import { WishlistService } from '../services/wishlist';

const SYNC_DELAY = ms('1h');

const normalizeCompareUrl = (raw: string) => {
	try {
		const url = new URL(raw);
		return `${url.protocol}//${url.host}${url.pathname}`;
	} catch {
		return raw;
	}
};

const syncing = new Map<string, Promise<Result<void>>>();
const _syncListConnection = async (connectionId: string): Promise<Result<void>> => {
	const connectionResult = await ConnectionsService.getWithItems(connectionId);
	if (connectionResult.kind !== 'success') return connectionResult;

	const connection = connectionResult.data;
	if (!connection) return $invalid('GENERIC', 'Cannot retrieve connection');

	const now = new Date();
	if (connection.lastSyncedAt && now.getTime() - connection.lastSyncedAt.getTime() < SYNC_DELAY) {
		const nextSync = new Date(connection.lastSyncedAt.getTime() + SYNC_DELAY);
		return $invalid('CONNECTION_SYNC_DELAY', { nextSync });
	}

	const candidatesResult = await generateItemCandidates(connection.url);
	if (candidatesResult.kind !== 'success') {
		await ConnectionsService.updateSyncStatus(connectionId, { syncError: true });
		return candidatesResult;
	}

	const candidates = candidatesResult.data;

	const existingItems = connection.items;
	const urlToId = new Map(
		existingItems.map((v) => [v.url ? normalizeCompareUrl(v.url) : null, v.id]),
	);

	const items = candidates.flatMap((candidate) => {
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
		await ConnectionsService.updateSyncStatus(connectionId, { syncError: true });
		return $invalid('CONNECTION_EMPTY', undefined);
	}

	await db().transaction(async (tx) => {
		const connectionsService = ConnectionsService.$with(tx);
		const itemsService = ItemsService.$with(tx);

		$unwrap(
			await connectionsService.updateSyncStatus(connectionId, {
				lastSyncedAt: new Date(),
				syncError: false,
			}),
		);

		if (items.length === 0) {
			$unwrap(await itemsService.deleteItemsByConnection(connectionId));
		} else {
			const activeIds = items.map((v) => v.id);
			$unwrap(await itemsService.deleteItemsByConnection(connectionId, ...activeIds));

			$unwrap(await itemsService.upsertItems(items));
		}
	});

	await WishlistService.touchList(connection.wishlistId);
	return $ok();
};

export const syncListConnection = (connectionId: string) => {
	const runningSync = syncing.get(connectionId);
	if (runningSync) return runningSync;

	try {
		const sync = _syncListConnection(connectionId).finally(() => {
			syncing.delete(connectionId);
		});

		syncing.set(connectionId, sync);
		return sync;
	} catch (err) {
		return Promise.resolve($fail(err));
	}
};
