import { rollingReadSession } from '$lib/server/auth';
import { Cookie } from '$lib/server/cookies';
import { DefaultTheme } from '$lib/util/theme';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await rollingReadSession(event.cookies);
	if (session) event.locals.user = { id: session.sub, name: session.name };

	const theme = Cookie.theme(event.cookies).read() || DefaultTheme;

	if (event.route.id !== '/status') {
		console.log(event.getClientAddress(), '-', event.route.id);
	}

	return await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace(
				/<html(\s[^>]*)?>/i,
				(_, attrs = '') => `<html${attrs} data-theme="${theme}">`,
			),
	});
};
