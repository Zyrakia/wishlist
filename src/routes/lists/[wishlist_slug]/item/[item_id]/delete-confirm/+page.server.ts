import type { PageServerLoad } from './$types';
import { verifyAuth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ parent }) => {
	const owner = (await parent()).wishlist.userId;
	verifyAuth({ check: (user) => user.id === owner, failStrategy: 'error' });
};
