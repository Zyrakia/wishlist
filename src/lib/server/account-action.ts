import { CreateCredentialsSchema } from '$lib/schemas/auth';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import z from 'zod';

import { db } from './db';
import { AccountActionTable } from './db/schema';

const AccountActionSchemas = {
	'change-email': z.object({
		newEmail: CreateCredentialsSchema.shape.email,
	}),

	'reset-password': z.object({}),
};

export type AccountAction = keyof typeof AccountActionSchemas;

export type AccountActionPayload<T extends AccountAction> = z.infer<
	(typeof AccountActionSchemas)[T]
>;

export const createAccountAction = async <T extends AccountAction>(
	userId: string,
	lifetimeMs: number,
	type: T,
	payload: AccountActionPayload<T>,
) => {
	const token = randomUUID();
	const expiresAt = new Date(Date.now() + lifetimeMs);

	await db().insert(AccountActionTable).values({
		token,
		userId,
		type,
		payload,
		expiresAt,
	});

	return { token, expiresAt };
};

export const peekAccountAction = async <T extends AccountAction>(
	token: string,
	expectedType: T,
) => {
	const action = await db().query.AccountActionTable.findFirst({
		where: (t, { eq }) => eq(t.token, token),
		with: { user: true },
	});

	if (!action || action.type !== expectedType) return;

	const now = new Date();
	if (action.expiresAt.getTime() < now.getTime()) return;

	const { success, data: payload } = AccountActionSchemas[expectedType].safeParse(action.payload);
	if (!success) return;

	return {
		expiresAt: action.expiresAt,
		user: action.user,
		payload: payload as AccountActionPayload<T>,
	};
};
export const resolveAccountAction = async <T extends AccountAction>(
	token: string,
	expectedType: T,
) => {
	const action = await db().query.AccountActionTable.findFirst({
		where: (t, { eq }) => eq(t.token, token),
	});

	if (!action) return;

	await db().delete(AccountActionTable).where(eq(AccountActionTable.token, token));

	if (action.type !== expectedType) return;

	const now = new Date();
	if (action.expiresAt.getTime() < now.getTime()) return;

	const { success, data: payload } = AccountActionSchemas[expectedType].safeParse(action.payload);
	if (!success) return;

	return {
		userId: action.userId,
		expiresAt: action.expiresAt,
		payload: payload as AccountActionPayload<T>,
	};
};
