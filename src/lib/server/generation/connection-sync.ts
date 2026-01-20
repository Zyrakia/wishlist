import { ItemSchema } from '$lib/schemas/item';
import { safePrune } from '$lib/util/safe-prune';
import { randomUUID } from 'crypto';
import ms from 'ms';
import { Err, Ok, type Result } from 'ts-results';

import { db } from '../db';
import { ConnectionsService } from '../services/connections';
import { ItemsService } from '../services/items';
import { generateItemCandidates, type ItemCandidate } from './item-generator';
import { DomainError } from '../util/service';
import { WishlistService } from '../services/wishlist';
import { formatRelative } from '$lib/util/date';

const SYNC_DELAY = ms('1h');

const normalizeCompareUrl = (raw: string) => {
	try {
		const url = new URL(raw);
		return `${url.protocol}//${url.host}${url.pathname}`;
	} catch {
		return raw;
	}
};

const syncing = new Map<string, Promise<Result<void, unknown>>>();
const _syncListConnection = async (connectionId: string): Promise<Result<void, unknown>> => {
	const connectionResult = await ConnectionsService.getByIdWithItems(connectionId);
	if (connectionResult.err) return connectionResult;

	const connection = connectionResult.val;
	if (!connection) return Err(DomainError.of('Cannot retrieve connection'));

	const now = new Date();
	if (connection.lastSyncedAt && now.getTime() - connection.lastSyncedAt.getTime() < SYNC_DELAY) {
		const nextSync = new Date(connection.lastSyncedAt.getTime() + SYNC_DELAY);
		return Err(DomainError.of(`Next sync ${formatRelative(nextSync)}`));
	}

	const candidatesResult = await generateItemCandidates(connection.url);
	if (candidatesResult.err) {
		(
			await ConnectionsService.updateSyncStatusById(connectionId, {
				syncError: true,
			})
		).unwrap();

		return candidatesResult;
	}

	const candidates: ItemCandidate[] = candidatesResult.val;

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
		(
			await ConnectionsService.updateSyncStatusById(connectionId, {
				syncError: true,
			})
		).unwrap();

		return Err(DomainError.of('No products found, is the list private?'));
	}

	await db().transaction(async (tx) => {
		const connectionsService = ConnectionsService.$with(tx);
		const itemsService = ItemsService.$with(tx);

		(
			await connectionsService.updateSyncStatusById(connectionId, {
				lastSyncedAt: new Date(),
				syncError: false,
			})
		).unwrap();

		if (items.length === 0) {
			(await itemsService.deleteByConnectionId(connectionId)).unwrap();
		} else {
			const activeIds = items.map((item) => item.id);
			(
				await itemsService.deleteByConnectionId(connectionId, ...activeIds)
			).unwrap();

			(await itemsService.upsert(items)).unwrap();
		}
	});

	(await WishlistService.touchById(connection.wishlistId)).unwrap();
	return Ok(undefined);
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
		return Promise.resolve(
			Err(err instanceof DomainError ? err : DomainError.of('Connection sync failed')),
		);
	}
};
