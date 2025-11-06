import { command, form, getRequestEvent, query } from '$app/server';
import { CreateCredentialsSchema, CredentialsSchema } from '$lib/schemas/auth';
import { clearSession, issueToken, readSession, setSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { UserTable } from '$lib/server/db/schema';
import ENV from '$lib/server/env.server';
import { compare, hash } from 'bcryptjs';
import { v4 as uuid4 } from 'uuid';
import z from 'zod';

import { redirect } from '@sveltejs/kit';

export const getMe = query(async () => {
	const { cookies } = getRequestEvent();
	const payload = await readSession(cookies);
	if (payload) return { id: payload.sub, name: payload.name };
});

export const resolveMe = query(async () => {
	const me = await getMe();
	if (!me) return;

	return await db().query.UserTable.findFirst({
		where: (t, { eq }) => eq(t.id, me.id),
	});
});

export const register = form(CreateCredentialsSchema, async (data, invalid) => {
	const { username, email, password } = data;
	const { cookies, url } = getRequestEvent();

	const existing = await db().query.UserTable.findFirst({
		where: (t, { eq }) => eq(t.email, email),
	});
	if (existing) invalid(invalid.email('Email is already registered'));

	const passwordHash = await hash(password, ENV.SALT_ROUNDS);
	const id = uuid4();

	await db().insert(UserTable).values({
		id,
		email,
		name: username,
		password: passwordHash,
	});

	const token = await issueToken({ sub: id, name: username });
	setSession(cookies, token);

	const { data: returnUrl } = ReturnUrlSchema.safeParse(url.searchParams.get('redirect'));
	redirect(303, returnUrl || '/');
});

const ReturnUrlSchema = z.string().regex(/^\/(?!\/)/);

export const login = form(CredentialsSchema.omit({ username: true }), async (data, invalid) => {
	const { email, password } = data;
	const { cookies, url } = getRequestEvent();

	const user = await db().query.UserTable.findFirst({
		where: (t, { eq }) => eq(t.email, email),
	});

	if (!user) return invalid('Invalid credentials');

	const passwordValid = await compare(password, user.password);
	if (!passwordValid) invalid('Invalid credentials');

	const token = await issueToken({ sub: user.id, name: user.name });
	setSession(cookies, token);

	const { data: returnUrl } = ReturnUrlSchema.safeParse(url.searchParams.get('redirect'));
	redirect(303, returnUrl || '/');
});

export const logout = command(async () => {
	const { cookies } = getRequestEvent();
	clearSession(cookies);
});
