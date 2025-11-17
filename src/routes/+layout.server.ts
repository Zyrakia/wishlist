import { Cookie } from '$lib/server/cookies';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	return { user: locals.user, savedTheme: Cookie.theme(cookies).read() };
};
