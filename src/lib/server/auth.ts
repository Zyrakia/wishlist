import type { Cookies } from '@sveltejs/kit';
import { createSecretKey } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import z from 'zod';
import ENV from './env.server';

const COOKIE_NAME = 'session';
const SECRET_KEY = createSecretKey(ENV.JWT_SECRET, 'utf-8');

const TokenSchema = z.object({
	sub: z.string(),
	name: z.string(),
});

type Token = z.infer<typeof TokenSchema>;

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
