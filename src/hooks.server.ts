import { getMe } from '$lib/remotes/auth.remote';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await getMe();
	return await resolve(event);
};
