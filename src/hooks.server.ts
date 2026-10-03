import { clearSession, rollingReadSession } from '$lib/server/auth';
import { UsersService } from '$lib/server/services/users';
import { unwrap } from '$lib/server/util/service';
import { getTheme } from '$lib/server/theme';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await rollingReadSession(event.cookies);
	if (session) {
		const user = unwrap(await UsersService.getPublicById(session.sub));
		if (user) event.locals.user = { id: user.id, name: user.name };
		else clearSession(event.cookies);
	}

	const theme = getTheme(event.cookies);

	return await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace(
				/<html(\s[^>]*)?>/i,
				(_, attrs = '') => `<html${attrs} data-theme="${theme}">`,
			),
	});
};
