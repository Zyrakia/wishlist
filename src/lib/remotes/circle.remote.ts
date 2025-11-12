import { form, getRequestEvent, query } from '$app/server';
import { CredentialsSchema } from '$lib/schemas/auth';
import { CircleSchema } from '$lib/schemas/circle';
import { verifyAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import {
	CircleInviteTable,
	CircleMembershipTable,
	CircleTable,
	UserTable,
	WishlistTable,
} from '$lib/server/db/schema';
import { strBoolean } from '$lib/util/zod';
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { and, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import z from 'zod';
import { resolveMe } from './auth.remote';

export const createCircle = form(CircleSchema, async (data, invalid) => {
	const user = verifyAuth();

	const existing = await db().query.CircleTable.findFirst({
		where: (t, { eq }) => eq(t.ownerId, user.id),
	});
	if (existing) invalid('You can only own one circle');

	const circle = db().transaction((tx) => {
		const circle = tx
			.insert(CircleTable)
			.values({
				id: randomUUID(),
				ownerId: user.id,
				memberLimit: 25,
				...data,
			})
			.returning()
			.get();

		if (!circle) tx.rollback();

		tx.insert(CircleMembershipTable)
			.values({
				circleId: circle.id,
				userId: user.id,
			})
			.run();

		return circle;
	});

	redirect(303, `/circles/${circle.id}`);
});

export const updateCircle = form(CircleSchema.partial(), async (data) => {
	const {
		params: { circle_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!circle_id) error(400, 'A circle ID is required');

	const circle = await db().query.CircleTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.id, circle_id), eq(t.ownerId, user.id)),
	});

	if (!circle) error(400, 'Invalid circle ID provided');

	await db().update(CircleTable).set(data).where(eq(CircleTable.id, circle_id));
	redirect(303, `/circles/${circle.id}`);
});

export const deleteCircle = form(
	z.object({ confirm: z.union([z.boolean(), strBoolean()]) }),
	async ({ confirm }) => {
		const {
			params: { circle_id },
		} = getRequestEvent();

		const user = verifyAuth();
		if (!circle_id) error(400, 'A circle ID is required');
		if (!confirm) redirect(303, `/circles/${circle_id}/delete-confirm`);

		const circle = await db().query.CircleTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, circle_id), eq(t.ownerId, user.id)),
		});

		if (!circle) error(400, 'Invalid circle ID provided');

		await db().delete(CircleTable).where(eq(CircleTable.id, circle.id));
		redirect(303, '/');
	},
);

export const issueCircleInvite = form(
	z.object({ targetEmail: CredentialsSchema.shape.email }),
	async ({ targetEmail }, invalid) => {
		const {
			params: { circle_id },
		} = getRequestEvent();

		const user = verifyAuth();
		if (!circle_id) error(400, 'A circle ID is required');

		const circle = await db().query.CircleTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, circle_id), eq(t.ownerId, user.id)),
			extras: {
				memberCount:
					sql<number>`(select count(*) from ${CircleMembershipTable} where ${CircleMembershipTable.circleId} = ${CircleTable.id})`.as(
						'memberCount',
					),
			},
		});

		if (!circle) error(400, 'Invalid circle ID provided');
		if (circle.memberCount >= circle.memberLimit) invalid('The circle is alrady full');

		const existingUser = await db().query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.email, targetEmail),
		});

		if (existingUser) {
			const existingMembership = await db().query.CircleMembershipTable.findFirst({
				where: (t, { and, eq }) =>
					and(eq(t.circleId, circle.id), eq(t.userId, existingUser.id)),
			});

			if (existingMembership) invalid('User is already a member');
		}

		const existingInvite = await db().query.CircleInviteTable.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.circleId, circle.id), eq(t.targetEmail, targetEmail)),
		});

		if (existingInvite) invalid('User is already invited');

		const secret = randomUUID();
		await db()
			.insert(CircleInviteTable)
			.values({ circleId: circle.id, targetEmail, id: secret });

		// TODO publish invite by email
		redirect(303, `/circles/${circle.id}`);
	},
);

export const revokeCircleInvite = form(z.object({ inviteId: z.string() }), async ({ inviteId }) => {
	const {
		params: { circle_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!circle_id) error(400, 'A circle ID is required');

	const circle = await db().query.CircleTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.id, circle_id), eq(t.ownerId, user.id)),
	});

	if (!circle) error(400, 'Invalid circle ID provided');

	await db().delete(CircleInviteTable).where(eq(CircleInviteTable.id, inviteId));
	redirect(303, `/circles/${circle.id}`);
});

export const resolveCircleInvite = form(
	z.object({ inviteId: z.string(), decision: z.enum(['accept', 'decline']) }),
	async ({ inviteId, decision }, invalid) => {
		const user = await resolveMe();
		if (!user) error(401);

		const invite = await db().query.CircleInviteTable.findFirst({
			where: (t, { eq }) => eq(t.id, inviteId),
		});

		if (!invite) return invalid(invalid.inviteId('Invite invalid or expired'));
		if (invite.targetEmail !== user.email) invalid(invalid.inviteId('This is not your invite'));

		if (decision === 'decline') {
			await db().delete(CircleInviteTable).where(eq(CircleInviteTable.id, invite.id));
			redirect(303, `/`);
		}

		const circle = await db().query.CircleTable.findFirst({
			where: (t, { eq }) => eq(t.id, invite.circleId),
			extras: {
				memberCount:
					sql<number>`(select count(*) from ${CircleMembershipTable} where ${CircleMembershipTable.circleId} = ${CircleTable.id})`.as(
						'memberCount',
					),
			},
		});

		if (!circle) return invalid(invalid.inviteId('Circle does not exist'));
		if (circle.memberCount >= circle.memberLimit)
			return invalid(invalid.inviteId('Circle is full'));

		db().transaction((tx) => {
			tx.insert(CircleMembershipTable)
				.values({
					userId: user.id,
					circleId: invite.circleId,
				})
				.run();

			tx.delete(CircleInviteTable).where(eq(CircleInviteTable.id, invite.id)).run();
		});

		redirect(303, `/`);
	},
);

export const removeCircleMember = form(z.object({ targetId: z.string() }), async ({ targetId }) => {
	const {
		params: { circle_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!circle_id) error(400, 'A circle ID is required');

	const circle = await db().query.CircleTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.id, circle_id), eq(t.ownerId, user.id)),
	});

	if (!circle) error(400, 'Invalid circle ID provided');

	const membership = await db().query.CircleMembershipTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.circleId, circle.id), eq(t.userId, targetId)),
	});

	if (!membership) error(400, 'User is not an active member');

	await db()
		.delete(CircleMembershipTable)
		.where(
			and(
				eq(CircleMembershipTable.circleId, circle.id),
				eq(CircleMembershipTable.userId, targetId),
			),
		);

	redirect(303, `/circles/${circle.id}`);
});

export const getCircleInvites = query(async () => {
	const user = await resolveMe();
	if (!user) return [];

	return await db().query.CircleInviteTable.findMany({
		where: (t, { eq }) => eq(t.targetEmail, user.email),
		with: {
			circle: {
				columns: { name: true },
				with: { owner: { columns: { name: true } } },
			},
		},
	});
});

export const getCircles = query(async () => {
	const user = verifyAuth();
	return await db()
		.select(getTableColumns(CircleTable))
		.from(CircleMembershipTable)
		.innerJoin(CircleTable, eq(CircleTable.id, CircleMembershipTable.circleId))
		.where(eq(CircleMembershipTable.userId, user.id));
});

export const getCirclesActivity = query(async () => {
	const user = verifyAuth();

	const circles = await getCircles();
	if (!circles.length) return [];

	const circleIds = circles.map((v) => v.id);
	const activity = await db()
		.select({
			circleId: CircleMembershipTable.circleId,
			userName: UserTable.name,
			...getTableColumns(WishlistTable),
		})
		.from(CircleMembershipTable)
		.innerJoin(WishlistTable, eq(WishlistTable.userId, CircleMembershipTable.userId))
		.innerJoin(UserTable, eq(UserTable.id, WishlistTable.userId))
		.where(inArray(CircleMembershipTable.circleId, circleIds))
		.orderBy(desc(WishlistTable.activityAt));

	const circlesWithActivity = circles.map((circle) => ({
		circle,
		activity: activity.filter((a) => a.circleId === circle.id),
	}));

	return circlesWithActivity.sort((a) => (a.circle.ownerId === user.id ? -1 : 1));
});
