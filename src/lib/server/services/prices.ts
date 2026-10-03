import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm';
import { Ok } from 'ts-results-es';

import { db } from '../db';
import { ItemPriceTable, WishlistItemTable } from '../db/schema';
import { createService } from '../util/service';

const DEFAULT_CURRENCY = 'USD';

export interface PriceObservation {
	itemId: string;
	price: number | null;
	currency: string | null;
}

export const withLatestPrice = {
	latestPrice: { columns: { price: true, currency: true } },
} as const;

/**
 * Replaces the `latestPrice` relation with flat `price` and `priceCurrency` fields.
 */
export const flattenPrice = <
	T extends { latestPrice: { price: number; currency: string } | null },
>({
	latestPrice,
	...item
}: T) => ({
	...item,
	price: latestPrice?.price ?? null,
	priceCurrency: latestPrice?.currency ?? null,
});

export const PricesService = createService(db(), {
	/**
	 * Records observed prices, appending a price row only for items whose
	 * latest price differs. A `null` price clears the item's latest price
	 * while keeping its history, a `null` currency keeps the current one.
	 *
	 * @param observations the observed prices
	 * @returns the IDs of items whose latest price changed
	 */
	record: async (client, observations: PriceObservation[]) => {
		if (observations.length === 0) return Ok([] as string[]);

		return Ok(
			await client.transaction(async (tx) => {
				const latest = await tx
					.select({
						itemId: WishlistItemTable.id,
						price: ItemPriceTable.price,
						currency: ItemPriceTable.currency,
					})
					.from(WishlistItemTable)
					.leftJoin(ItemPriceTable, eq(ItemPriceTable.id, WishlistItemTable.priceId))
					.where(
						inArray(
							WishlistItemTable.id,
							observations.map((v) => v.itemId),
						),
					);

				const latestByItem = new Map(latest.map((v) => [v.itemId, v]));
				const cleared: string[] = [];
				const changed: Array<typeof ItemPriceTable.$inferInsert> = [];

				for (const { itemId, price, currency } of observations) {
					const current = latestByItem.get(itemId);
					if (!current) continue;

					if (price === null) {
						if (current.price !== null) cleared.push(itemId);
						continue;
					}

					const next = {
						itemId,
						price,
						currency: currency || current.currency || DEFAULT_CURRENCY,
					};
					if (current.price === next.price && current.currency === next.currency)
						continue;
					changed.push(next);
				}

				if (cleared.length) {
					await tx
						.update(WishlistItemTable)
						.set({ priceId: null })
						.where(inArray(WishlistItemTable.id, cleared));
				}

				if (changed.length) {
					const inserted = await tx
						.insert(ItemPriceTable)
						.values(changed)
						.returning({ id: ItemPriceTable.id, itemId: ItemPriceTable.itemId });

					for (const { id, itemId } of inserted) {
						await tx
							.update(WishlistItemTable)
							.set({ priceId: id })
							.where(eq(WishlistItemTable.id, itemId));
					}
				}

				return [...cleared, ...changed.map((v) => v.itemId)];
			}),
		);
	},

	/**
	 * Marks items as having had their price checked.
	 *
	 * @param itemIds the IDs of the checked items
	 * @param checkedAt when the check happened
	 */
	markChecked: async (client, itemIds: string[], checkedAt = new Date()) => {
		if (itemIds.length === 0) return Ok(undefined);

		await client
			.update(WishlistItemTable)
			.set({ priceCheckedAt: checkedAt })
			.where(inArray(WishlistItemTable.id, itemIds));

		return Ok(undefined);
	},

	/**
	 * Lists items with a link whose price has not been checked since a cutoff,
	 * least recently checked first.
	 *
	 * @param checkedBefore the cutoff for the last check
	 * @param limit the maximum number of items
	 */
	listStale: async (client, checkedBefore: Date, limit: number) => {
		const items = await client
			.select({ id: WishlistItemTable.id, url: WishlistItemTable.url })
			.from(WishlistItemTable)
			.where(
				and(
					isNotNull(WishlistItemTable.url),
					or(
						isNull(WishlistItemTable.priceCheckedAt),
						lt(WishlistItemTable.priceCheckedAt, checkedBefore),
					),
				),
			)
			.orderBy(asc(WishlistItemTable.priceCheckedAt))
			.limit(limit);

		return Ok(items as Array<{ id: string; url: string }>);
	},

	/**
	 * Fetches the price history of an item, newest first.
	 *
	 * @param itemId the item ID to lookup
	 */
	historyForItem: async (client, itemId: string) => {
		const prices = await client
			.select({
				price: ItemPriceTable.price,
				currency: ItemPriceTable.currency,
				createdAt: ItemPriceTable.createdAt,
			})
			.from(ItemPriceTable)
			.where(eq(ItemPriceTable.itemId, itemId))
			.orderBy(desc(ItemPriceTable.createdAt), desc(ItemPriceTable.id));

		return Ok(prices);
	},
});
