import type { Cookies } from '@sveltejs/kit';

type ParseOpts = Parameters<Cookies['get']>[1];
type SerializeOpts = Parameters<Cookies['set']>[2];

export interface CookieHandle {
	/**
	 * Sets the value of this cookie.
	 */
	set: (value: string, opts?: Partial<SerializeOpts>) => void;

	/**
	 * Reads the current value of this cookie.
	 */
	read: (opts?: ParseOpts) => string | undefined;

	/**
	 * Deletes this cookie
	 */
	clear: (opts?: Partial<SerializeOpts>) => void;
}

/**
 * Creates a cookie modification utility bound to a cookie name.
 *
 * @param cookieName the name of the cookie
 * @param baseSerialize the default options used on set/clear
 * @param baseParse the default parse options used on read
 * @returns a function that can be called with a cookies object to access the utilities
 */
export function cookieHandle(
	cookieName: string,
	baseSerialize: SerializeOpts = { path: '/' },
	baseParse?: ParseOpts,
) {
	return (cookies: Cookies): CookieHandle => {
		const set: CookieHandle['set'] = (value, opts = {}) =>
			cookies.set(cookieName, value, { ...baseSerialize, ...opts });

		const read: CookieHandle['read'] = (opts) =>
			cookies.get(cookieName, { ...baseParse, ...opts });

		const clear: CookieHandle['clear'] = (opts = { maxAge: 0 }) =>
			cookies.delete(cookieName, { ...baseSerialize, ...opts });

		return {
			set,
			read,
			clear,
		};
	};
}
