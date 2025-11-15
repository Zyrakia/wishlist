import { verifyAuth } from '$lib/server/auth';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, parent }) => {
	const owner = (await parent()).wishlist.userId;
	verifyAuth({ check: (user) => user.id === owner, failStrategy: 'error' });

	return { listHeaderBadge: ['Create Mode'] };
};
