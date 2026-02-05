import type { LayoutServerLoad } from '../testing/$types';

export const load: LayoutServerLoad = () => {
	return { showHeader: false };
};
