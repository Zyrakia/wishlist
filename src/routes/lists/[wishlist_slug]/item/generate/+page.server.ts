import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { headerBadges: ['Create Mode'] };
};
