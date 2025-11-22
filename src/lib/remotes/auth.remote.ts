import { form, getRequestEvent, query } from '$app/server';
import { CreateCredentialsSchema, CredentialsSchema, ResetPasswordSchema } from '$lib/schemas/auth';
import {
	createAccountAction,
	issueToken,
	resolveAccountAction,
	setSession,
	verifyAuth,
	readSession,
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

import { error, redirect } from '@sveltejs/kit';

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

	const passwordHash = await hash(password, ENV.SALT_ROUNDS);
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

	const passwordValid = await compare(password, user.password);
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
			const { token, expiresAt } = await createAccountAction(user.id, ms('11m'));
			const { url } = getRequestEvent();

			const emailResult = await sendEmail(email, {
				template: {
					id: '6c41869c-105c-4ec1-9054-c0a65c97beaf',
					variables: {
						RESET_LINK: `${url.protocol}//${url.host}/reset-password/${token}`,
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

export const changeName = form(CredentialsSchema.pick({ username: true }), async ({ username }) => {
	const me = verifyAuth();
	await db().update(UserTable).set({ name: username }).where(eq(UserTable.id, me.id));
});

export const changeEmailStart = form(
	CredentialsSchema.pick({ email: true }),
	async ({ email }, invalid) => {
		const me = await resolveMe({});
		const { token, expiresAt } = await createAccountAction(me.id, ms('11m'));
		const { url } = getRequestEvent();

		await db().transaction;
		const emailResult = await sendEmail(email, {
			template: {
				id: '89718909-12de-4156-b766-5989ae2ab206',
				variables: {
					RESET_LINK: `${url.protocol}//${url.host}/account?mode=changeEmail&token=${token}`,
					EXPIRES_AT: formatRelative(expiresAt),
				},
			},
		});

		if (!emailResult.success) {
			return invalid('Please try again later, emails are down.');
		}
	},
);

export const changeEmail = form(
	CredentialsSchema.pick({ email: true }).extend({ token: z.string() }),
	async ({ email, token }) => {
		const me = await resolveAccountAction(token);
		if (!me) error(401);

		await db().update(UserTable).set({ email: email }).where(eq(UserTable.id, me.userId));

		redirect(303, '/account?mode=emailChanged');
	},
);
