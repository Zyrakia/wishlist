import { Ok } from 'ts-results-es';

import { db } from '../db';
import { generateItemCandidate } from '../generation/item-generator';
import { createService, unwrap } from '../util/service';
import { PricesService } from './prices';

export type RenewalOutcome = 'changed' | 'unchanged' | 'failed';

export interface RenewalReport {
	itemId: string;
	outcome: RenewalOutcome;
}

let queue: Promise<unknown> = Promise.resolve();

// Overlapping runs would pick the same stale items
const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
	const run = queue.then(job, job);
	queue = run.catch(() => {});
	return run;
};

const renewItem = async (item: { id: string; url: string }): Promise<RenewalOutcome> => {
	const candidate = await generateItemCandidate(item.url, 'background');
	unwrap(await PricesService.markChecked([item.id]));

	if (candidate.isErr() || candidate.value.price == null) return 'failed';

	const changed = unwrap(
		await PricesService.record([
			{
				itemId: item.id,
				price: candidate.value.price,
				currency: candidate.value.priceCurrency ?? null,
			},
		]),
	);

	return changed.length ? 'changed' : 'unchanged';
};

export const PriceRenewalService = createService(db(), {
	/**
	 * Re-reads the price of the least recently checked items from their links,
	 * recording a new latest price when it changed.
	 *
	 * @param checkedBefore only renew items not checked since this time
	 * @param limit the maximum number of items to renew
	 */
	renewStale: async (_client, checkedBefore: Date, limit: number) => {
		return Ok(
			await enqueue(async () => {
				const items = unwrap(await PricesService.listStale(checkedBefore, limit));

				const reports: RenewalReport[] = [];
				for (const item of items) {
					reports.push({ itemId: item.id, outcome: await renewItem(item) });
				}
				return reports;
			}),
		);
	},
});
