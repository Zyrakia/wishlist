import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { showHeader: false };
};
