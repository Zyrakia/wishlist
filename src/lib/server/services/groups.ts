import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { GroupInviteTable, GroupMembershipTable, GroupTable } from '../db/schema';
import { createClientService } from '../util/client-service';

export const GroupsService = createClientService(db(), {
	/**
	 * Fetches a group owned by a user.
	 *
	 * @param ownerId the owner ID to lookup
	 */
	getGroupByOwner: async (client, ownerId: string) => {
		return await client.query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.ownerId, ownerId),
		});
	},

	/**
	 * Creates a group and membership for the owner.
	 *
	 * @param data the group data to insert
	 */
	createGroup: async (client, data: typeof GroupTable.$inferInsert) => {
		return await client.transaction(async (tx) => {
			const group = await tx.insert(GroupTable).values(data).returning().get();

			GroupsService.$with(tx).createMembership({
				groupId: group.id,
				userId: group.ownerId,
			});

			return group;
		});
	},

	/**
	 * Fetches a group owned by a user by ID.
	 *
	 * @param groupId the group ID to lookup
	 * @param ownerId the owner ID to scope by
	 */
	getOwnedGroupById: async (client, groupId: string, ownerId: string) => {
		return await client.query.GroupTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, groupId), eq(t.ownerId, ownerId)),
		});
	},

	/**
	 * Fetches a group by ID with owner details.
	 *
	 * @param groupId the group ID to lookup
	 */
	getGroupWithOwner: async (client, groupId: string) => {
		return await client.query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.id, groupId),
			with: { owner: { columns: { id: true, name: true } } },
		});
	},

	/**
	 * Updates a group by ID.
	 *
	 * @param groupId the group ID to update
	 * @param data the fields to update
	 */
	updateGroup: async (client, groupId: string, data: Partial<typeof GroupTable.$inferInsert>) => {
		await client.update(GroupTable).set(data).where(eq(GroupTable.id, groupId));
	},

	/**
	 * Deletes a group by ID.
	 *
	 * @param groupId the group ID to delete
	 */
	deleteGroup: async (client, groupId: string) => {
		await client.delete(GroupTable).where(eq(GroupTable.id, groupId));
	},

	/**
	 * Fetches a group with invite and member counts.
	 *
	 * @param groupId the group ID to lookup
	 * @param ownerId the owner ID to scope by
	 */
	getGroupWithInviteCounts: async (client, groupId: string, ownerId: string) => {
		return await client.query.GroupTable.findFirst({
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
	},

	/**
	 * Fetches a group by ID.
	 *
	 * @param groupId the group ID to lookup
	 */
	getGroupById: async (client, groupId: string) => {
		return await client.query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.id, groupId),
		});
	},

	/**
	 * Fetches a group with its member count.
	 *
	 * @param groupId the group ID to lookup
	 */
	getGroupWithMemberCount: async (client, groupId: string) => {
		return await client.query.GroupTable.findFirst({
			where: (t, { eq }) => eq(t.id, groupId),
			extras: {
				memberCount:
					sql<number>`(select count(*) from ${GroupMembershipTable} where ${GroupMembershipTable.groupId} = ${GroupTable.id})`.as(
						'memberCount',
					),
			},
		});
	},

	/**
	 * Fetches a group invite by ID.
	 *
	 * @param inviteId the invite ID to lookup
	 */
	getInviteById: async (client, inviteId: string) => {
		return await client.query.GroupInviteTable.findFirst({
			where: (t, { eq }) => eq(t.id, inviteId),
		});
	},

	/**
	 * Fetches a group invite with group details.
	 *
	 * @param inviteId the invite ID to lookup
	 */
	getInviteWithGroup: async (client, inviteId: string) => {
		return await client.query.GroupInviteTable.findFirst({
			where: (t, { eq }) => eq(t.id, inviteId),
			with: {
				group: {
					columns: { name: true },
					with: { owner: { columns: { name: true } } },
				},
			},
		});
	},

	/**
	 * Fetches a group invite by group and email.
	 *
	 * @param groupId the group ID to scope by
	 * @param targetEmail the invitee email to lookup
	 */
	getInviteByGroupAndEmail: async (client, groupId: string, targetEmail: string) => {
		return await client.query.GroupInviteTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.groupId, groupId), eq(t.targetEmail, targetEmail)),
		});
	},

	/**
	 * Creates a group invite.
	 *
	 * @param data the invite data to insert
	 */
	createInvite: async (client, data: typeof GroupInviteTable.$inferInsert) => {
		return await client.insert(GroupInviteTable).values(data).returning();
	},

	/**
	 * Deletes a group invite by ID.
	 *
	 * @param inviteId the invite ID to delete
	 */
	deleteInviteById: async (client, inviteId: string) => {
		await client.delete(GroupInviteTable).where(eq(GroupInviteTable.id, inviteId));
	},

	/**
	 * Fetches a group membership by group and user.
	 *
	 * @param groupId the group ID to scope by
	 * @param userId the user ID to scope by
	 */
	getMembershipByGroupAndUser: async (client, groupId: string, userId: string) => {
		return await client.query.GroupMembershipTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.groupId, groupId), eq(t.userId, userId)),
		});
	},

	/**
	 * Creates a group membership.
	 *
	 * @param data the membership data to insert
	 */
	createMembership: async (client, data: typeof GroupMembershipTable.$inferInsert) => {
		await client.insert(GroupMembershipTable).values(data);
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
			await GroupsService.$with(tx).createMembership({
				userId,
				groupId,
			});

			await GroupsService.$with(tx).deleteInviteById(inviteId);
		});
	},

	/**
	 * Deletes a group membership by group and user.
	 *
	 * @param groupId the group ID to scope by
	 * @param userId the user ID to scope by
	 */
	deleteMembership: async (client, groupId: string, userId: string) => {
		await client
			.delete(GroupMembershipTable)
			.where(
				and(
					eq(GroupMembershipTable.groupId, groupId),
					eq(GroupMembershipTable.userId, userId),
				),
			);
	},

	/**
	 * Lists invites for a target email.
	 *
	 * @param targetEmail the email address to lookup
	 */
	getInvitesForEmail: async (client, targetEmail: string) => {
		return await client.query.GroupInviteTable.findMany({
			where: (t, { eq }) => eq(t.targetEmail, targetEmail),
			with: {
				group: {
					columns: { name: true },
					with: { owner: { columns: { name: true } } },
				},
			},
		});
	},

	/**
	 * Lists group members with recent wishlists.
	 *
	 * @param groupId the group ID to lookup
	 */
	getMembersWithLists: async (client, groupId: string, listLimit = 4) => {
		return await client.query.GroupMembershipTable.findMany({
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
	},

	/**
	 * Lists pending invites for a group.
	 *
	 * @param groupId the group ID to lookup
	 */
	getInvitesByGroup: async (client, groupId: string) => {
		return await client.query.GroupInviteTable.findMany({
			where: (t, { eq }) => eq(t.groupId, groupId),
			orderBy: (t, { desc }) => desc(t.createdAt),
		});
	},

	/**
	 * Lists group IDs for a user.
	 *
	 * @param userId the user ID to lookup
	 */
	getMembershipsForUser: async (client, userId: string) => {
		return await client.query.GroupMembershipTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			columns: { groupId: true },
		});
	},

	/**
	 * Lists group memberships for a set of users.
	 *
	 * @param userIds the user IDs to lookup
	 */
	getMembershipsForUsers: async (client, userIds: string[]) => {
		return await client.query.GroupMembershipTable.findMany({
			where: (t, { inArray }) => inArray(t.userId, userIds),
			columns: { userId: true, groupId: true },
		});
	},

	/**
	 * Lists group activity for a user.
	 *
	 * @param userId the user ID to lookup
	 */
	getGroupActivity: async (client, userId: string) => {
		return await client.query.GroupMembershipTable.findMany({
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
	},
});
