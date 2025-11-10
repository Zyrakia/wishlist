import type { Cookies } from '@sveltejs/kit';
import { Cookie } from './cookies';

export function getTheme(cookies: Cookies) {
	return Cookie.theme(cookies).read();
}

export function setTheme(cookies: Cookies, theme: string) {
	return Cookie.theme(cookies).set(theme);
}
