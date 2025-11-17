import { dev } from '$app/environment';
import ms from 'ms';

import ENV from './env.server';
import { cookieHandle } from './util/cookie-handle';

export const Cookie = {
	theme: cookieHandle('theme', { path: '/', maxAge: ms('1yr') / 1000 }),
	session: cookieHandle('session', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: ENV.JWT_LIFETIME.seconds,
	}),
} as const;
