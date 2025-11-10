import { getMe } from '$lib/remotes/auth.remote';
import { Cookie } from '$lib/server/cookies';
import { DefaultTheme } from '$lib/util/theme';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await getMe();
	const theme = Cookie.theme(event.cookies).read() || DefaultTheme;
	return await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace(
				/<html(\s[^>]*)?>/i,
				(match, attrs = '') => `<html${attrs} data-theme="${theme}">`,
			),
	});
};
