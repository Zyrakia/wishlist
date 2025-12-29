import { getTheme } from '$lib/server/theme';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	return { user: locals.user, savedTheme: getTheme(cookies) };
};
