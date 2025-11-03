import { ItemSchema } from '$lib/schemas/item';
import { safePrune } from '$lib/util/safe-prune';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const initItem = safePrune(ItemSchema, Object.fromEntries(url.searchParams.entries()));

	return { headerBadges: ['Create Mode'], initItem };
};
