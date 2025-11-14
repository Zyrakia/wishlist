import type { PageServerLoad } from './$types';
import { verifyAuth } from '$lib/server/auth';

export const load: PageServerLoad = () => {
	const user = verifyAuth();
	return { user };
};
