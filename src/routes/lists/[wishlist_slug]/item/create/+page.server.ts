import { ItemSchema } from '$lib/schemas/item';
import { verifyAuth } from '$lib/server/auth';
import { safePrune } from '$lib/util/safe-prune';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
	const owner = (await parent()).wishlist.userId;
	verifyAuth({ check: (user) => user.id === owner, failStrategy: 'error' });

	const initItem = safePrune(ItemSchema, Object.fromEntries(url.searchParams.entries()));
	return { headerBadges: ['Create Mode'], initItem };
};
