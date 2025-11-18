import { verifyAuth } from '$lib/server/auth';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	const owner = parentData.wishlist.userId;
	verifyAuth({ check: (user) => user.id === owner, failStrategy: 'error' });

	return { listHeaderBadge: ['Edit Mode', parentData.item.name] };
};
