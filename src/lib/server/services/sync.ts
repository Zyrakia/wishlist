import { ItemSchema } from '$lib/schemas/item';
import { formatRelative } from '$lib/util/date';
import { safePrune } from '$lib/util/safe-prune';
import { randomUUID } from 'crypto';
import ms from 'ms';
import { Err, Ok, type Result } from 'ts-results-es';

import { db, type DatabaseClient } from '../db';
import { generateItemCandidates, type ItemCandidate } from '../generation/item-generator';
import { createService, DomainError, unwrap } from '../util/service';
import { ConnectionsService } from './connections';
import { ItemsService } from './items';
import { WishlistService } from './wishlist';

const SYNC_DELAY = ms('1h');

export const normalizeCompareUrl = (raw: string) => {
	try {
		const url = new URL(raw);
		return `${url.protocol}//${url.host}${url.pathname}`;
	} catch {
		return raw;
	}
};

const syncing = new Map<string, Promise<Result<void, unknown>>>();

const _syncConnection = async (
	client: DatabaseClient,
	connectionId: string,
): Promise<Result<void, DomainError>> => {
	const connection = unwrap(await ConnectionsService.getByIdWithItems(connectionId));
	if (!connection) return Err(DomainError.of('Cannot retrieve connection'));

	const now = new Date();
	if (connection.lastSyncedAt && now.getTime() - connection.lastSyncedAt.getTime() < SYNC_DELAY) {
		const nextSync = new Date(connection.lastSyncedAt.getTime() + SYNC_DELAY);
		return Err(DomainError.of(`Next sync ${formatRelative(nextSync)}`));
	}

	const candidatesResult = await generateItemCandidates(connection.url);
	if (candidatesResult.isErr()) {
		unwrap(await ConnectionsService.updateSyncStatusById(connectionId, { syncError: true }));
		return candidatesResult;
	}

	const candidates: ItemCandidate[] = candidatesResult.value;

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
		unwrap(await ConnectionsService.updateSyncStatusById(connectionId, { syncError: true }));
		return Err(DomainError.of('No products found, is the list private?'));
	}

	await client.transaction(async (tx) => {
		const connectionsService = ConnectionsService.$with(tx);
		const itemsService = ItemsService.$with(tx);

		unwrap(
			await connectionsService.updateSyncStatusById(connectionId, {
				lastSyncedAt: new Date(),
				syncError: false,
			}),
		);

		if (items.length === 0) {
			unwrap(await itemsService.deleteByConnectionId(connectionId));
		} else {
			const activeIds = items.map((item) => item.id);
			unwrap(await itemsService.deleteByConnectionId(connectionId, ...activeIds));
			unwrap(await itemsService.upsert(items));
		}
	});

	unwrap(await WishlistService.touchById(connection.wishlistId));
	return Ok(undefined);
};

export const SyncService = createService(db(), {
	syncConnection: async (client, connectionId: string) => {
		const runningSync = syncing.get(connectionId);
		if (runningSync) return runningSync;

		const sync = _syncConnection(client, connectionId).finally(() => {
			syncing.delete(connectionId);
		});

		syncing.set(connectionId, sync);
		return sync;
	},
});
