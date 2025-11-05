import { verifyAuth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const owner = (await parent()).wishlist.userId;
	verifyAuth({ check: (user) => user.id === owner, failStrategy: 'error' });

	return { headerBadges: ['Pending Deletion'] };
};
