import { getRequestEvent } from '$app/server';
import { Cookie } from '$lib/server/cookies';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const {
		locals: { user },
		cookies,
	} = getRequestEvent();

	return { user, savedTheme: Cookie.theme(cookies).read() };
};
