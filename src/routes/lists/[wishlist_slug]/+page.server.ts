import { z } from 'zod';
import type { PageServerLoad } from './$types';
import { safePruneParams } from '$lib/util/safe-prune.js';

const ParamsSchema = z.object({
	focusItem: z.string(),
});

export const load: PageServerLoad = async ({ url, parent }) => {
	const { wishlist } = await parent();
	const props = safePruneParams(ParamsSchema, url.searchParams);

	const focusItem = props.focusItem
		? wishlist.items.find((v) => v.id === props.focusItem)
		: undefined;

	return { focusItemId: focusItem?.id };
};
