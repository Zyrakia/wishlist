import { dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { createSecretKey } from 'crypto';
import { jwtVerify, SignJWT } from 'jose';
import z from 'zod';

import { type Cookies, error, redirect } from '@sveltejs/kit';

import ENV from './env.server';

const COOKIE_NAME = 'session';
const SECRET_KEY = createSecretKey(ENV.JWT_SECRET, 'utf-8');

const TokenSchema = z.object({
	sub: z.string(),
	name: z.string(),
});

type Token = z.infer<typeof TokenSchema>;

export const verifyAuth = ({
	check,
	failStrategy = 'login',
}: {
	failStrategy?: 'login' | 'register' | 'error';
	check?: (user: Exclude<App.Locals['user'], undefined>) => boolean;
} = {}) => {
	const {
		locals: { user },
		url,
	} = getRequestEvent();

	const fail = () => {
		const returnUrl = encodeURIComponent(url.pathname + url.search);
		switch (failStrategy) {
			case 'login':
				redirect(303, `/login?redirect=${returnUrl}`);
			case 'register':
				redirect(303, `/register?redirect=${returnUrl}`);
			case 'error':
				error(401);
		}
	};

	if (!user) return fail();
	if (check && !check(user)) return fail();

	return user;
};

export const issueToken = async (token: Token) => {
	return await new SignJWT(token)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(ENV.JWT_LIFETIME.formatted)
		.sign(SECRET_KEY);
};

export const readToken = async (jwt: string) => {
	try {
		const res = await jwtVerify(jwt, SECRET_KEY);
		return TokenSchema.parse(res.payload);
	} catch (err) {}
};

export const setSession = (cookies: Cookies, value: string) => {
	cookies.set(COOKIE_NAME, value, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: value ? ENV.JWT_LIFETIME.seconds : 0,
	});
};

export const readSession = async (cookies: Cookies) => {
	const token = cookies.get(COOKIE_NAME);
	if (!token) return;

	return readToken(token);
};

export const clearSession = (cookies: Cookies) => {
	cookies.delete(COOKIE_NAME, { path: '/' });
};
