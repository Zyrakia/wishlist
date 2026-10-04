import { ItemSchema } from '$lib/schemas/item';
import { formatRelative } from '$lib/util/date';
import { safePrune } from '$lib/util/safe-prune';
import { dissectUrl } from '$lib/util/url';
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
	const url = dissectUrl(raw, 'protocol', 'host', 'pathname');
	if (!url) return raw;

	return `${url.protocol}//${url.host}${url.pathname}`;
};

const itemSyncKey = (item: { url?: string | null; name: string }) => {
	if (item.url) return `url:${normalizeCompareUrl(item.url)}`;
	return `name:${item.name.trim().toLowerCase()}`;
};

const syncing = new Set<string>();

const cooldownError = (lastSyncedAt: Date | null) => {
	if (!lastSyncedAt || Date.now() - lastSyncedAt.getTime() >= SYNC_DELAY) return;

	const nextSync = new Date(lastSyncedAt.getTime() + SYNC_DELAY);
	return DomainError.of(`Next sync ${formatRelative(nextSync)}`);
};

export const isConnectionSyncing = (connectionId: string) => syncing.has(connectionId);

const _syncConnection = async (
	client: DatabaseClient,
	connectionId: string,
): Promise<Result<void, DomainError>> => {
	const connection = unwrap(await ConnectionsService.getByIdWithItems(connectionId));
	if (!connection) return Err(DomainError.of('Cannot retrieve connection'));

	const cooldown = cooldownError(connection.lastSyncedAt);
	if (cooldown) return Err(cooldown);

	const candidatesResult = await generateItemCandidates(connection.url);
	if (candidatesResult.isErr()) {
		unwrap(await ConnectionsService.updateSyncStatusById(connectionId, { syncError: true }));
		return candidatesResult;
	}

	const candidates: ItemCandidate[] = candidatesResult.value;

	const keyToId = new Map(connection.items.map((v) => [itemSyncKey(v), v.id]));
	const seenKeys = new Set<string>();

	const items = candidates.flatMap((candidate) => {
		if (!candidate.name || !candidate.valid) return [];

		const data = safePrune(ItemSchema, candidate);
		const name = data.name || 'No Product Name';

		const key = itemSyncKey({ url: data.url, name });
		if (seenKeys.has(key)) return [];
		seenKeys.add(key);

		return [
			{
				id: keyToId.get(key) || randomUUID(),
				wishlistId: connection.wishlistId,
				connectionId: connection.id,
				...data,
				name,
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
	/**
	 * Starts syncing a connection in the background unless it is already syncing.
	 * Fails right away if the connection is missing or synced too recently.
	 *
	 * @param connectionId the connection to sync
	 */
	requestSync: async (client, connectionId: string) => {
		if (syncing.has(connectionId)) return Ok(undefined);

		const connection = unwrap(await ConnectionsService.getById(connectionId));
		if (!connection) return Err(DomainError.of('Cannot retrieve connection'));

		const cooldown = cooldownError(connection.lastSyncedAt);
		if (cooldown) return Err(cooldown);

		if (syncing.has(connectionId)) return Ok(undefined);
		syncing.add(connectionId);

		void ConnectionsService.updateSyncStatusById(connectionId, { syncError: false })
			.then(() => _syncConnection(client, connectionId))
			.catch((err) => console.warn(err))
			.finally(() => syncing.delete(connectionId));

		return Ok(undefined);
	},
});
