import { form, getRequestEvent, query } from '$app/server';
import {
	ChangePasswordSchema,
	CreateCredentialsSchema,
	CredentialsSchema,
	ResetPasswordSchema,
} from '$lib/schemas/auth';
import {
	issueToken,
	setSession,
	verifyAuth,
	readSession,
	compPasswords,
	hashPassword,
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { UserTable } from '$lib/server/db/schema';
import { sendEmail } from '$lib/server/email';
import ENV from '$lib/server/env.server';
import { formatRelative } from '$lib/util/date';
import { eq } from 'drizzle-orm';
import ms from 'ms';
import { v4 as uuid4 } from 'uuid';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';
import { createAccountAction, resolveAccountAction } from '$lib/server/account-action';

export const resolveMySession = query(async () => {
	const cookies = getRequestEvent().cookies;

	const session = await readSession(cookies);
	if (!session) return;

	return await db().query.UserTable.findFirst({
		where: (t, { eq }) => eq(t.id, session.sub),
	});
});

const failStratSchema = z.enum(['login', 'register', 'error']).optional();
export const getMe = query(
	z.object({ failStrategy: failStratSchema }),
	async ({ failStrategy }) => {
		return verifyAuth({ failStrategy });
	},
);

export const resolveMe = query(
	z.object({ failStrategy: failStratSchema }),
	async ({ failStrategy }) => {
		const me = verifyAuth({ failStrategy });

		const user = await db().query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.id, me.id),
		});

		return user!;
	},
);

export const register = form(CreateCredentialsSchema, async (data, invalid) => {
	const { username, email, password } = data;
	const { cookies, url } = getRequestEvent();

	const existing = await db().query.UserTable.findFirst({
		where: (t, { eq }) => eq(t.email, email),
	});
	if (existing) invalid(invalid.email('Email is already registered'));

	const passwordHash = await hashPassword(password);
	const id = uuid4();

	await db().insert(UserTable).values({
		id,
		email,
		name: username,
		password: passwordHash,
	});

	const token = await issueToken({ sub: id, name: username, rollingStartMs: Date.now() });
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

	const passwordValid = await compPasswords(password, user.password);
	if (!passwordValid) invalid('Invalid credentials');

	const token = await issueToken({ sub: user.id, name: user.name, rollingStartMs: Date.now() });
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
			const { token, expiresAt } = await createAccountAction(
				user.id,
				ms('11m'),
				'reset-password',
				{},
			);

			const { url } = getRequestEvent();

			const emailResult = await sendEmail(email, {
				template: {
					id: '6c41869c-105c-4ec1-9054-c0a65c97beaf',
					variables: {
						RESET_LINK: `${url.protocol}//${url.host}/reset-password/${encodeURIComponent(token)}`,
						EXPIRES_AT: formatRelative(expiresAt),
					},
				},
			});

			if (!emailResult.success) return { success: false };
		}

		return { success: true };
	},
);

export const resetPassword = form(
	ResetPasswordSchema,
	async ({ actionToken, password }, invalid) => {
		const action = await resolveAccountAction(actionToken, 'reset-password');
		if (!action) return invalid('Password reset link have expired');

		const passwordHash = await hashPassword(password);
		await db()
			.update(UserTable)
			.set({ password: passwordHash })
			.where(eq(UserTable.id, action.userId));

		redirect(303, `/login?updated=password`);
	},
);

export const changeName = form(
	CreateCredentialsSchema.pick({ username: true }),
	async ({ username }) => {
		const me = await resolveMe({});
		await db().update(UserTable).set({ name: username }).where(eq(UserTable.id, me.id));

		redirect(303, '/account');
	},
);

export const changePassword = form(ChangePasswordSchema, async (data, invalid) => {
	const { oldPassword, password: newPassword } = data;
	const me = await resolveMe({});

	const isOldPasswordValid = await compPasswords(oldPassword, me.password);
	if (!isOldPasswordValid) return invalid(invalid.oldPassword('Current password is invalid'));

	const newPasswordHash = await hashPassword(newPassword);
	await db().update(UserTable).set({ password: newPasswordHash }).where(eq(UserTable.id, me.id));

	redirect(303, '/account');
});

export const changeEmailStart = form(
	CredentialsSchema.pick({ email: true }),
	async ({ email }, invalid) => {
		const me = await resolveMe({});
		const { url } = getRequestEvent();

		const existing = await db().query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.email, email),
		});

		if (existing) return invalid(invalid.email('Email already taken'));

		const { token, expiresAt } = await createAccountAction(me.id, ms('11m'), 'change-email', {
			newEmail: email,
		});

		const emailResult = await sendEmail(email, {
			template: {
				id: '89718909-12de-4156-b766-5989ae2ab206',
				variables: {
					CHANGE_LINK: `${url.protocol}//${url.host}/account/change-email/${encodeURIComponent(token)}`,
					EXPIRES_AT: formatRelative(expiresAt),
				},
			},
		});

		if (!emailResult.success) {
			return invalid('Emails are temporarily down');
		} else redirect(303, '/account');
	},
);

export const changeEmail = form(z.object({ token: z.string() }), async ({ token }) => {
	const action = await resolveAccountAction(token, 'change-email');
	if (!action) error(401);

	await db()
		.update(UserTable)
		.set({ email: action.payload.newEmail })
		.where(eq(UserTable.id, action.userId));

	redirect(303, '/account');
});
