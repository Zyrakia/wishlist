import { getRequestEvent } from '$app/server';
import { createSecretKey, randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { jwtVerify, SignJWT } from 'jose';
import z from 'zod';

import { type Cookies, error, redirect } from '@sveltejs/kit';

import { Cookie } from './cookies';
import { db } from './db';
import { AccountActionTable } from './db/schema';
import ENV from './env.server';

const SECRET_KEY = createSecretKey(ENV.JWT_SECRET, 'utf-8');

const TokenSchema = z.object({
	sub: z.string(),
	name: z.string(),
	rollingStartMs: z.number(),
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

export const rollingReadSession = async (cookies: Cookies) => {
	const token = Cookie.session(cookies).read();
	if (!token) return;

	const payload = await readToken(token);
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

export const createAccountAction = async (userId: string, lifetimeMs: number) => {
	const token = randomUUID();

	const expiresAt = new Date();
	expiresAt.setTime(expiresAt.getTime() + lifetimeMs);

	await db().insert(AccountActionTable).values({
		userId,
		token,
		expiresAt,
	});

	return { token, expiresAt };
};

export const resolveAccountAction = async (token: string) => {
	const action = await db().query.AccountActionTable.findFirst({
		where: (t, { eq }) => eq(t.token, token),
	});

	if (!action) return;

	await db().delete(AccountActionTable).where(eq(AccountActionTable.token, token));

	const now = new Date();
	if (action.expiresAt.getTime() < now.getTime()) return;

	return { userId: action.userId };
};

export const peekAccountAction = async (token: string) => {
	const action = await db().query.AccountActionTable.findFirst({
		where: (t, { eq }) => eq(t.token, token),
		with: { user: true },
	});

	if (!action) return;

	const now = new Date();
	if (action.expiresAt.getTime() < now.getTime()) return;

	return { expiresAt: action.expiresAt, user: action.user };
};
