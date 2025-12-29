import type { Cookies } from '@sveltejs/kit';
import { Cookie } from './cookies';
import { DefaultTheme, ThemeSchema, type Theme } from '$lib/util/theme';

export function getTheme(cookies: Cookies) {
	const { data: theme } = ThemeSchema.safeParse(Cookie.theme(cookies).read());
	return theme || DefaultTheme;
}

export function setTheme(cookies: Cookies, theme: Theme) {
	return Cookie.theme(cookies).set(theme);
}
