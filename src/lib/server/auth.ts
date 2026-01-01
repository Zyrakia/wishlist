import { getRequestEvent } from '$app/server';
import bcrypt from 'bcryptjs';
import { createSecretKey } from 'crypto';
import { jwtVerify, SignJWT } from 'jose';
import z from 'zod';

import { type Cookies, error, redirect } from '@sveltejs/kit';

import { Cookie } from './cookies';
import ENV from '$lib/env';

const SECRET_KEY = createSecretKey(ENV.JWT_SECRET, 'utf-8');

const TokenSchema = z.object({
	sub: z.string(),
	name: z.string(),
	rollingStartMs: z.number(),
});

export type SessionToken = z.infer<typeof TokenSchema>;

export const hashPassword = async (raw: string) => {
	return await bcrypt.hash(raw, ENV.SALT_ROUNDS);
};

export const compPasswords = async (raw: string, hash: string) => {
	return await bcrypt.compare(raw, hash);
};

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

export const issueToken = async (token: SessionToken) => {
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
	Cookie.session(cookies).set(value);
};

export const readSession = async (cookies: Cookies) => {
	const token = Cookie.session(cookies).read();
	if (!token) return;

	return await readToken(token);
};

export const rollingReadSession = async (cookies: Cookies) => {
	const payload = await readSession(cookies);
	if (!payload) return;

	const now = Date.now();
	if (now - payload.rollingStartMs > ENV.JWT_MAX_LIFETIME.milliseconds) {
		clearSession(cookies);
		return;
	}

	const refreshed = await issueToken({ ...payload });
	setSession(cookies, refreshed);

	return payload;
};

export const clearSession = (cookies: Cookies) => {
	Cookie.session(cookies).clear();
};
