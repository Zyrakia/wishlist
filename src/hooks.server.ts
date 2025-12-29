import { rollingReadSession } from '$lib/server/auth';
import { getTheme } from '$lib/server/theme';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await rollingReadSession(event.cookies);
	if (session) event.locals.user = { id: session.sub, name: session.name };

	const theme = getTheme(event.cookies);

	return await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace(
				/<html(\s[^>]*)?>/i,
				(_, attrs = '') => `<html${attrs} data-theme="${theme}">`,
			),
	});
};
