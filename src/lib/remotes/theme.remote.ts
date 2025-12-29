import { command, form, getRequestEvent } from '$app/server';
import { getTheme, setTheme } from '$lib/server/theme';
import { ThemeSchema } from '$lib/util/theme';
import { redirect } from '@sveltejs/kit';
import z from 'zod';

export const getSavedTheme = command(() => {
	const { cookies } = getRequestEvent();
	return getTheme(cookies);
});

export const setSavedTheme = form(z.object({ theme: ThemeSchema }), async ({ theme }) => {
	const { cookies, url } = getRequestEvent();
	setTheme(cookies, theme);
	redirect(303, url);
});

export const toggleSavedTheme = form(async () => {
	const { cookies, url } = getRequestEvent();
	const theme = getTheme(cookies) === 'dark' ? 'light' : 'dark';
	setTheme(cookies, theme);
	redirect(303, url);
});
