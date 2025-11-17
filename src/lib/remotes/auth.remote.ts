import { form, getRequestEvent, query } from '$app/server';
import { CreateCredentialsSchema, CredentialsSchema, ResetPasswordSchema } from '$lib/schemas/auth';
import {
    createAccountAction, issueToken, readSession, resolveAccountAction, setSession
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { UserTable } from '$lib/server/db/schema';
import { sendEmail } from '$lib/server/email';
import ENV from '$lib/server/env.server';
import { formatRelative } from '$lib/util/date';
import { compare, hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import ms from 'ms';
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

export const resetPasswordStart = form(
	z.object({ email: CredentialsSchema.shape.email }),
	async ({ email }) => {
		const user = await db().query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.email, email),
		});

		if (user) {
			const { token, expiresAt } = await createAccountAction(user.id, ms('10m'));
			const { url } = getRequestEvent();

			await sendEmail(email, {
				template: {
					id: '6c41869c-105c-4ec1-9054-c0a65c97beaf',
					variables: {
						RESET_LINK: `${url.protocol}//${url.host}/reset-password/${token}`,
						EXPIRES_AT: formatRelative(expiresAt),
					},
				},
			});
		}

		return { success: true };
	},
);

export const resetPassword = form(
	ResetPasswordSchema,
	async ({ actionToken, password }, invalid) => {
		const user = await resolveAccountAction(actionToken);
		if (!user) return invalid('Password reset link have expired');

		const passwordHash = await hash(password, ENV.SALT_ROUNDS);
		await db()
			.update(UserTable)
			.set({ password: passwordHash })
			.where(eq(UserTable.id, user.userId));

		redirect(303, `/login?updated=password`);
	},
);
