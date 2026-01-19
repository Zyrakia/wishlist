import { form, getRequestEvent, query } from '$app/server';
import {
	ChangePasswordSchema,
	CreateCredentialsSchema,
	CredentialsSchema,
	ResetPasswordSchema,
	RoleSchema,
} from '$lib/schemas/auth';
import { createAccountAction, resolveAccountAction } from '$lib/server/account-action';
import {
	compPasswords,
	hashPassword,
	issueToken,
	readSession,
	setSession,
	verifyAuth,
} from '$lib/server/auth';
import { sendEmail } from '$lib/server/email';
import { UsersService } from '$lib/server/services/users';
import { $unwrap } from '$lib/util/result';
import { formatRelative } from '$lib/util/date';
import ms from 'ms';
import { v4 as uuid4 } from 'uuid';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';
import { GroupsService } from '$lib/server/services/groups';

export const resolveMySession = query(async () => {
	const ev = getRequestEvent();

	const session = await readSession(ev.cookies);
	if (!session) return;

	return $unwrap(await UsersService.getById(session.sub));
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

		const user = $unwrap(await UsersService.getById(me.id));

		return user!;
	},
);

export const checkRole = query(z.object({ targetRole: RoleSchema }), async ({ targetRole }) => {
	const me = await resolveMySession();
	return me?.role === targetRole;
});

export const register = form(CreateCredentialsSchema, async (data, invalid) => {
	const { username, email, password } = data;
	const { cookies, url } = getRequestEvent();

	const existing = $unwrap(await UsersService.getByEmail(email));
	if (existing) invalid(invalid.email('Email is already registered'));

	const passwordHash = await hashPassword(password);
	const id = uuid4();

	$unwrap(
		await UsersService.createUser({
			id,
			email,
			name: username,
			password: passwordHash,
		}),
	);

	const token = await issueToken({ sub: id, name: username, rollingStartMs: Date.now() });
	setSession(cookies, token);

	const { data: returnUrl } = ReturnUrlSchema.safeParse(url.searchParams.get('redirect'));
	redirect(303, returnUrl || '/');
});

const ReturnUrlSchema = z.string().regex(/^\/(?!\/)/);

export const login = form(CredentialsSchema.omit({ username: true }), async (data, invalid) => {
	const { email, password } = data;
	const { cookies, url } = getRequestEvent();

	const user = $unwrap(await UsersService.getByEmail(email));

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
		const user = $unwrap(await UsersService.getByEmail(email));

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
		$unwrap(await UsersService.updatePassword(action.userId, passwordHash));

		redirect(303, `/login?updated=password`);
	},
);

export const changeName = form(
	CreateCredentialsSchema.pick({ username: true }),
	async ({ username }) => {
		const me = await resolveMe({});
		$unwrap(await UsersService.updateName(me.id, username));

		redirect(303, `/account?notice=${encodeURIComponent('Your name has been updated.')}`);
	},
);

export const changePassword = form(ChangePasswordSchema, async (data, invalid) => {
	const { oldPassword, password: newPassword } = data;
	const me = await resolveMe({});

	const isOldPasswordValid = await compPasswords(oldPassword, me.password);
	if (!isOldPasswordValid) return invalid(invalid.oldPassword('Current password is invalid'));

	const newPasswordHash = await hashPassword(newPassword);
	$unwrap(await UsersService.updatePassword(me.id, newPasswordHash));

	redirect(303, `/account?notice=${encodeURIComponent('Your password has been updated.')}`);
});

const isEmailOpenForChange = async (email: string) => {
	const [existingUser, existingInvites] = await Promise.all([
		UsersService.getByEmail(email),
		GroupsService.getInvitesForEmail(email),
	]);

	return $unwrap(existingUser) === undefined && $unwrap(existingInvites).length === 0;
};

export const changeEmailStart = form(
	CredentialsSchema.pick({ email: true }),
	async ({ email }, invalid) => {
		const me = await resolveMe({});
		const { url } = getRequestEvent();

		if (!isEmailOpenForChange(email)) return invalid(invalid.email('Email already taken'));

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
		} else
			redirect(
				303,
				`/account?notice=${encodeURIComponent('A confirmation email has been sent.')}`,
			);
	},
);

export const changeEmail = form(z.object({ token: z.string() }), async ({ token }) => {
	const action = await resolveAccountAction(token, 'change-email');
	if (!action) error(401);

	if (!isEmailOpenForChange(action.payload.newEmail)) error(400, 'Email already taken');
	$unwrap(await UsersService.updateEmail(action.userId, action.payload.newEmail));

	redirect(303, `/account?notice=${encodeURIComponent('Your email has been updated.')}`);
});
