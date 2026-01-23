import { and, eq, sql } from 'drizzle-orm';
import { Err, Ok } from 'ts-results-es';

import { db } from '../db';
import { GroupInviteTable, GroupMembershipTable, GroupTable } from '../db/schema';
import { createService, DomainError } from '../util/service';

export const GroupsService = createService(db(), {
	/**
	 * Fetches a group owned by a user.
	 *
	 * @param ownerId the owner ID to lookup
	 */
	getByOwnerId: async (client, ownerId: string) => {
		const group = await client.query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.ownerId, ownerId),
		});
		return Ok(group);
	},

	/**
	 * Creates a group and membership for the owner.
	 *
	 * @param data the group data to insert
	 */
	create: async (client, data: typeof GroupTable.$inferInsert) => {
		const group = await client.transaction(async (tx) => {
			const created = await tx.insert(GroupTable).values(data).returning().get();

			await tx.insert(GroupMembershipTable).values({
				groupId: created.id,
				userId: created.ownerId,
			});

			return created;
		});
		return Ok(group);
	},

	/**
	 * Fetches a group owned by a user by ID.
	 *
	 * @param groupId the group ID to lookup
	 * @param ownerId the owner ID to scope by
	 */
	getByIdForOwner: async (client, groupId: string, ownerId: string) => {
		const group = await client.query.GroupTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, groupId), eq(t.ownerId, ownerId)),
		});
		return Ok(group);
	},

	/**
	 * Fetches a group by ID with owner details.
	 *
	 * @param groupId the group ID to lookup
	 */
	getByIdWithOwner: async (client, groupId: string) => {
		const group = await client.query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.id, groupId),
			with: { owner: { columns: { id: true, name: true } } },
		});
		return Ok(group);
	},

	/**
	 * Updates a group by ID.
	 *
	 * @param groupId the group ID to update
	 * @param data the fields to update
	 */
	updateById: async (client, groupId: string, data: Partial<typeof GroupTable.$inferInsert>) => {
		await client.update(GroupTable).set(data).where(eq(GroupTable.id, groupId));
		return Ok(undefined);
	},

	/**
	 * Deletes a group by ID.
	 *
	 * @param groupId the group ID to delete
	 */
	deleteById: async (client, groupId: string) => {
		await client.delete(GroupTable).where(eq(GroupTable.id, groupId));
		return Ok(undefined);
	},

	/**
	 * Fetches a group with invite and member counts.
	 *
	 * @param groupId the group ID to lookup
	 * @param ownerId the owner ID to scope by
	 */
	getByIdWithInviteCountsForOwner: async (client, groupId: string, ownerId: string) => {
		const group = await client.query.GroupTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, groupId), eq(t.ownerId, ownerId)),
			with: { owner: { columns: { name: true } } },
			extras: (t) => ({
				inviteCount:
					sql<number>`(select count(*) from ${GroupInviteTable} where ${GroupInviteTable.groupId} = ${groupId})`.as(
						'inviteCount',
					),
				memberCount:
					sql<number>`(select count(*) from ${GroupMembershipTable} where ${GroupMembershipTable.groupId} = ${groupId})`.as(
						'memberCount',
					),
			}),
		});
		return Ok(group);
	},

	/**
	 * Fetches a group by ID.
	 *
	 * @param groupId the group ID to lookup
	 */
	getById: async (client, groupId: string) => {
		const group = await client.query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.id, groupId),
		});
		return Ok(group);
	},

	/**
	 * Fetches a group with its member count.
	 *
	 * @param groupId the group ID to lookup
	 */
	getByIdWithMemberCount: async (client, groupId: string) => {
		const group = await client.query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.id, groupId),
			extras: {
				memberCount:
					sql<number>`(select count(*) from ${GroupMembershipTable} where ${GroupMembershipTable.groupId} = ${GroupTable.id})`.as(
						'memberCount',
					),
			},
		});
		return Ok(group);
	},

	/**
	 * Fetches a group invite by ID.
	 *
	 * @param inviteId the invite ID to lookup
	 */
	getInviteById: async (client, inviteId: string) => {
		const invite = await client.query.GroupInviteTable.findFirst({
			where: (t, { eq }) => eq(t.id, inviteId),
		});
		return Ok(invite);
	},

	/**
	 * Fetches a group invite with group details.
	 *
	 * @param inviteId the invite ID to lookup
	 */
	getInviteByIdWithGroup: async (client, inviteId: string) => {
		const invite = await client.query.GroupInviteTable.findFirst({
			where: (t, { eq }) => eq(t.id, inviteId),
			with: {
				group: {
					columns: { name: true },
					with: { owner: { columns: { name: true } } },
				},
			},
		});
		return Ok(invite);
	},

	/**
	 * Fetches a group invite by group and email.
	 *
	 * @param groupId the group ID to scope by
	 * @param targetEmail the invitee email to lookup
	 */
	getInviteByGroupIdAndEmail: async (client, groupId: string, targetEmail: string) => {
		const invite = await client.query.GroupInviteTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.groupId, groupId), eq(t.targetEmail, targetEmail)),
		});
		return Ok(invite);
	},

	/**
	 * Creates a group invite.
	 *
	 * @param data the invite data to insert
	 */
	createInvite: async (client, data: typeof GroupInviteTable.$inferInsert) => {
		const invites = await client.insert(GroupInviteTable).values(data).returning();
		return Ok(invites);
	},

	/**
	 * Deletes a group invite by ID.
	 *
	 * @param inviteId the invite ID to delete
	 */
	deleteInviteById: async (client, inviteId: string) => {
		await client.delete(GroupInviteTable).where(eq(GroupInviteTable.id, inviteId));
		return Ok(undefined);
	},

	/**
	 * Fetches a group membership by group and user.
	 *
	 * @param groupId the group ID to scope by
	 * @param userId the user ID to scope by
	 */
	getMembershipByGroupIdAndUserId: async (client, groupId: string, userId: string) => {
		const membership = await client.query.GroupMembershipTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.groupId, groupId), eq(t.userId, userId)),
		});
		return Ok(membership);
	},

	/**
	 * Creates a group membership.
	 *
	 * @param data the membership data to insert
	 */
	createMembership: async (client, data: typeof GroupMembershipTable.$inferInsert) => {
		await client.insert(GroupMembershipTable).values(data);
		return Ok(undefined);
	},

	/**
	 * Accepts an invite by creating membership and deleting invite.
	 *
	 * @param groupId the group ID to join
	 * @param userId the user ID to add
	 * @param inviteId the invite ID to remove
	 */
	acceptInvite: async (client, groupId: string, userId: string, inviteId: string) => {
		await client.transaction(async (tx) => {
			await tx.insert(GroupMembershipTable).values({
				userId,
				groupId,
			});

			await tx.delete(GroupInviteTable).where(eq(GroupInviteTable.id, inviteId));
		});
		return Ok(undefined);
	},

	/**
	 * Deletes a group membership by group and user.
	 *
	 * @param groupId the group ID to scope by
	 * @param userId the user ID to scope by
	 */
	deleteMembershipByGroupIdAndUserId: async (client, groupId: string, userId: string) => {
		await client
			.delete(GroupMembershipTable)
			.where(
				and(
					eq(GroupMembershipTable.groupId, groupId),
					eq(GroupMembershipTable.userId, userId),
				),
			);
		return Ok(undefined);
	},

	/**
	 * Lists invites for a target email.
	 *
	 * @param targetEmail the email address to lookup
	 */
	listInvitesByEmail: async (client, targetEmail: string) => {
		const invites = await client.query.GroupInviteTable.findMany({
			where: (t, { eq }) => eq(t.targetEmail, targetEmail),
			with: {
				group: {
					columns: { name: true },
					with: { owner: { columns: { name: true } } },
				},
			},
		});
		return Ok(invites);
	},

	/**
	 * Lists group members with recent wishlists.
	 *
	 * @param groupId the group ID to lookup
	 */
	listMembersWithListsByGroupId: async (client, groupId: string, listLimit = 4) => {
		const members = await client.query.GroupMembershipTable.findMany({
			where: (t, { eq }) => eq(t.groupId, groupId),
			orderBy: (t, { asc }) => asc(t.joinedAt),
			with: {
				user: {
					columns: { id: true, name: true },
					with: {
						wishlists: {
							orderBy: (t, { desc }) => desc(t.activityAt),
							limit: listLimit,
						},
					},
				},
			},
		});
		return Ok(members);
	},

	/**
	 * Lists pending invites for a group.
	 *
	 * @param groupId the group ID to lookup
	 */
	listInvitesByGroupId: async (client, groupId: string) => {
		const invites = await client.query.GroupInviteTable.findMany({
			where: (t, { eq }) => eq(t.groupId, groupId),
			orderBy: (t, { desc }) => desc(t.createdAt),
		});
		return Ok(invites);
	},

	/**
	 * Lists group IDs for a user.
	 *
	 * @param userId the user ID to lookup
	 */
	listMembershipsByUserId: async (client, userId: string) => {
		const memberships = await client.query.GroupMembershipTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			columns: { groupId: true },
		});
		return Ok(memberships);
	},

	/**
	 * Lists group memberships for a set of users.
	 *
	 * @param userIds the user IDs to lookup
	 */
	listMembershipsByUserIds: async (client, userIds: string[]) => {
		const memberships = await client.query.GroupMembershipTable.findMany({
			where: (t, { inArray }) => inArray(t.userId, userIds),
			columns: { userId: true, groupId: true },
		});
		return Ok(memberships);
	},

	/**
	 * Lists group activity for a user.
	 *
	 * @param userId the user ID to lookup
	 */
	listActivityByUserId: async (client, userId: string) => {
		const activity = await client.query.GroupMembershipTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			with: {
				group: {
					with: {
						members: {
							with: {
								user: {
									columns: { name: true, id: true },
									with: {
										wishlists: {
											where: (t, { ne }) => ne(t.userId, userId),
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
		return Ok(activity);
	},

	sharesByUserIds: async (client, userOneId: string, userTwoId: string) => {
		if (userOneId === userTwoId) return Ok(false);

		const [userOneGroups, userTwoGroups] = await Promise.all([
			client.query.GroupMembershipTable.findMany({
				where: (t, { eq }) => eq(t.userId, userOneId),
				columns: { groupId: true },
			}),
			client.query.GroupMembershipTable.findMany({
				where: (t, { eq }) => eq(t.userId, userTwoId),
				columns: { groupId: true },
			}),
		]);

		const userOneGroupIds = new Set(userOneGroups.map((v) => v.groupId));
		return Ok(userTwoGroups.some((v) => userOneGroupIds.has(v.groupId)));
	},

	sharesByUserIdsOrErr: async (client, userOneId: string, userTwoId: string) => {
		if (userOneId === userTwoId) return Err(DomainError.of('Reservation not allowed'));

		const [userOneGroups, userTwoGroups] = await Promise.all([
			client.query.GroupMembershipTable.findMany({
				where: (t, { eq }) => eq(t.userId, userOneId),
				columns: { groupId: true },
			}),
			client.query.GroupMembershipTable.findMany({
				where: (t, { eq }) => eq(t.userId, userTwoId),
				columns: { groupId: true },
			}),
		]);

		const userOneGroupIds = new Set(userOneGroups.map((v: { groupId: string }) => v.groupId));
		const sharesGroup = userTwoGroups.some((v: { groupId: string }) =>
			userOneGroupIds.has(v.groupId),
		);

		if (!sharesGroup) return Err(DomainError.of('Reservation not allowed'));
		return Ok(true);
	},
});
