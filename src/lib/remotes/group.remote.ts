import { form, getRequestEvent, query } from '$app/server';
import { CredentialsSchema } from '$lib/schemas/auth';
import { GroupSchema } from '$lib/schemas/group';
import { verifyAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { GroupInviteTable, GroupMembershipTable, GroupTable } from '$lib/server/db/schema';
import { sendEmail } from '$lib/server/email';
import { strBoolean } from '$lib/util/zod';
import { randomUUID } from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

import { resolveMe } from './auth.remote';

export const createGroup = form(GroupSchema, async (data, invalid) => {
	const user = verifyAuth();

	const existing = await db().query.GroupTable.findFirst({
		where: (t, { eq }) => eq(t.ownerId, user.id),
	});
	if (existing) invalid('You can only own one group');

	const group = await db().transaction(async (tx) => {
		const group = await tx
			.insert(GroupTable)
			.values({
				id: randomUUID(),
				ownerId: user.id,
				memberLimit: 25,
				...data,
			})
			.returning()
			.get();

		await tx.insert(GroupMembershipTable).values({
			groupId: group.id,
			userId: user.id,
		});

		return group;
	});

	redirect(303, `/groups/${group.id}`);
});

export const updateGroup = form(GroupSchema.partial(), async (data) => {
	const {
		params: { group_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!group_id) error(400, 'A group ID is required');

	const group = await db().query.GroupTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.id, group_id), eq(t.ownerId, user.id)),
	});

	if (!group) error(400, 'Invalid group ID provided');

	await db().update(GroupTable).set(data).where(eq(GroupTable.id, group_id));
	redirect(303, `/groups/${group.id}`);
});

export const deleteGroup = form(
	z.object({ confirm: z.union([z.boolean(), strBoolean()]) }),
	async ({ confirm }) => {
		const {
			params: { group_id },
		} = getRequestEvent();

		const user = verifyAuth();
		if (!group_id) error(400, 'A group ID is required');
		if (!confirm) redirect(303, `/groups/${group_id}/delete-confirm`);

		const group = await db().query.GroupTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, group_id), eq(t.ownerId, user.id)),
		});

		if (!group) error(400, 'Invalid group ID provided');

		await db().delete(GroupTable).where(eq(GroupTable.id, group.id));
		redirect(303, '/');
	},
);

export const issueGroupInvite = form(
	z.object({ targetEmail: CredentialsSchema.shape.email }),
	async ({ targetEmail }, invalid) => {
		const {
			params: { group_id },
			url,
		} = getRequestEvent();

		const user = verifyAuth();
		if (!group_id) error(400, 'A group ID is required');

		const group = await db().query.GroupTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, group_id), eq(t.ownerId, user.id)),
			with: { owner: { columns: { name: true } } },
			extras: (t) => ({
				inviteCount:
					sql<number>`(select count(*) from ${GroupInviteTable} where ${GroupInviteTable.groupId} = ${group_id})`.as(
						'inviteCount',
					),
				memberCount:
					sql<number>`(select count(*) from ${GroupMembershipTable} where ${GroupMembershipTable.groupId} = ${group_id})`.as(
						'memberCount',
					),
			}),
		});

		if (!group) error(400, 'Invalid group ID provided');
		if (group.memberCount >= group.memberLimit) invalid('The group is alrady full');
		else if (group.memberCount + group.inviteCount >= group.memberLimit)
			invalid('Too many pending invites');

		const existingUser = await db().query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.email, targetEmail),
		});

		if (existingUser) {
			const existingMembership = await db().query.GroupMembershipTable.findFirst({
				where: (t, { and, eq }) =>
					and(eq(t.groupId, group.id), eq(t.userId, existingUser.id)),
			});

			if (existingMembership) invalid('User is already a member');
		}

		const existingInvite = await db().query.GroupInviteTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.groupId, group.id), eq(t.targetEmail, targetEmail)),
		});

		if (existingInvite) invalid('User is already invited');

		const secret = randomUUID();
		const [createdInvite] = await db()
			.insert(GroupInviteTable)
			.values({ groupId: group.id, targetEmail, id: secret })
			.returning();

		await sendEmail(targetEmail, {
			template: {
				id: '0cad8285-fea4-43c2-8837-641554ed5841',
				variables: {
					SENDER: group.owner.name,
					GROUP: group.name,
					INVITE_LINK: `${url.protocol}//${url.host}/groups/invite/${encodeURIComponent(createdInvite.id)}`,
				},
			},
		});

		redirect(303, `/groups/${group.id}`);
	},
);

export const revokeGroupInvite = form(z.object({ inviteId: z.string() }), async ({ inviteId }) => {
	const {
		params: { group_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!group_id) error(400, 'A group ID is required');

	const group = await db().query.GroupTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.id, group_id), eq(t.ownerId, user.id)),
	});

	if (!group) error(400, 'Invalid group ID provided');

	await db().delete(GroupInviteTable).where(eq(GroupInviteTable.id, inviteId));
	redirect(303, `/groups/${group.id}`);
});

export const resolveGroupInvite = form(
	z.object({ inviteId: z.string(), decision: z.enum(['accept', 'decline']) }),
	async ({ inviteId, decision }, invalid) => {
		const user = await resolveMe({});
		if (!user) error(401);

		const invite = await db().query.GroupInviteTable.findFirst({
			where: (t, { eq }) => eq(t.id, inviteId),
		});

		if (!invite) return invalid(invalid.inviteId('Invite invalid or expired'));
		if (invite.targetEmail !== user.email) invalid(invalid.inviteId('This is not your invite'));

		if (decision === 'decline') {
			await db().delete(GroupInviteTable).where(eq(GroupInviteTable.id, invite.id));
			redirect(303, `/`);
		}

		const group = await db().query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.id, invite.groupId),
			extras: {
				memberCount:
					sql<number>`(select count(*) from ${GroupMembershipTable} where ${GroupMembershipTable.groupId} = ${GroupTable.id})`.as(
						'memberCount',
					),
			},
		});

		if (!group) return invalid(invalid.inviteId('Group does not exist'));
		if (group.memberCount >= group.memberLimit)
			return invalid(invalid.inviteId('Group is full'));

		await db().transaction(async (tx) => {
			await tx.insert(GroupMembershipTable).values({
				userId: user.id,
				groupId: invite.groupId,
			});

			await tx.delete(GroupInviteTable).where(eq(GroupInviteTable.id, invite.id));
		});

		redirect(303, `/`);
	},
);

export const removeGroupMember = form(z.object({ targetId: z.string() }), async ({ targetId }) => {
	const {
		params: { group_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!group_id) error(400, 'A group ID is required');

	const group = await db().query.GroupTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.id, group_id), eq(t.ownerId, user.id)),
	});

	if (!group) error(400, 'Invalid group ID provided');
	if (group.ownerId === targetId) error(400, 'Cannot kick group owner');

	const membership = await db().query.GroupMembershipTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.groupId, group.id), eq(t.userId, targetId)),
	});

	if (!membership) error(400, 'User is not an active member');

	await db()
		.delete(GroupMembershipTable)
		.where(
			and(
				eq(GroupMembershipTable.groupId, group.id),
				eq(GroupMembershipTable.userId, targetId),
			),
		);

	redirect(303, `/groups/${group.id}`);
});

export const getMyInvites = query(async () => {
	const user = await resolveMe({});
	if (!user) return [];

	return await db().query.GroupInviteTable.findMany({
		where: (t, { eq }) => eq(t.targetEmail, user.email),
		with: {
			group: {
				columns: { name: true },
				with: { owner: { columns: { name: true } } },
			},
		},
	});
});

export const getGroupActivity = query(async () => {
	const user = verifyAuth();

	const memberships = await db().query.GroupMembershipTable.findMany({
		where: (t, { eq }) => eq(t.userId, user.id),
		with: {
			group: {
				with: {
					members: {
						with: {
							user: {
								columns: { name: true, id: true },
								with: {
									wishlists: {
										where: (t, { ne }) => ne(t.userId, user.id),
										orderBy: (t, { desc }) => desc(t.activityAt),
										limit: 5,
									},
								},
							},
						},
					},
				},
			},
		},
	});

	return memberships.map(({ group }) => {
		const wishlists = group.members.flatMap((member) => {
			return member.user.wishlists.map((wishlist) => ({
				...wishlist,
				userId: member.user.id,
				userName: member.user.name,
			}));
		});

		wishlists.sort((a, b) => {
			return b.activityAt.getTime() - a.activityAt.getTime();
		});

		return {
			group: { ...group, members: undefined },
			activity: wishlists.slice(0, 5),
		};
	});
});
