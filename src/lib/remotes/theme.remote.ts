import { command, getRequestEvent } from '$app/server';
import { Cookie } from '$lib/server/cookies';
import z from 'zod';

export const getSavedTheme = command(() => {
	const { cookies } = getRequestEvent();
	return Cookie.theme(cookies).read();
});

export const setSavedTheme = command(z.object({ theme: z.string().max(24) }), ({ theme }) => {
	const { cookies } = getRequestEvent();
	return Cookie.theme(cookies).set(theme);
});
