import { getRequestEvent } from '$app/server';
import { createSecretKey, randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { jwtVerify, SignJWT } from 'jose';
import z from 'zod';

import { type Cookies, error, redirect } from '@sveltejs/kit';

import { Cookie } from './cookies';
import { db } from './db';
import { PendingAccountActionTable } from './db/schema';
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
	Cookie.session(cookies).set(value);
};

export const readSession = async (cookies: Cookies) => {
	const token = Cookie.session(cookies).read();
	if (!token) return;

	return readToken(token);
};

export const clearSession = (cookies: Cookies) => {
	Cookie.session(cookies).clear();
};

export const createAccountAction = async (userId: string, lifetimeMs: number) => {
	const token = randomUUID();

	const expiresAt = new Date();
	expiresAt.setTime(expiresAt.getTime() + lifetimeMs);

	await db().insert(PendingAccountActionTable).values({
		userId,
		token,
		expiresAt,
	});

	return { token, expiresAt };
};

export const resolveAccountAction = async (token: string) => {
	const action = await db().query.PendingAccountActionTable.findFirst({
		where: (t, { eq }) => eq(t.token, token),
	});

	if (!action) return undefined;

	await db().delete(PendingAccountActionTable).where(eq(PendingAccountActionTable.token, token));

	const now = new Date();
	if (action.expiresAt.getTime() < now.getTime()) return;

	return { userId: action.userId };
};
