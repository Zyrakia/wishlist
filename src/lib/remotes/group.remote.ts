import { form, getRequestEvent, query } from '$app/server';
import { CredentialsSchema } from '$lib/schemas/auth';
import { GroupSchema } from '$lib/schemas/group';
import { verifyAuth } from '$lib/server/auth';
import { sendEmail } from '$lib/server/email';
import { GroupsService } from '$lib/server/services/groups';
import { UsersService } from '$lib/server/services/users';
import { strBoolean } from '$lib/util/zod';
import { randomUUID } from 'crypto';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

import { resolveMe } from './auth.remote';
import { cleanReservationsAfterGroupExit } from '$lib/server/reservations';

export const createGroup = form(GroupSchema, async (data, invalid) => {
	const user = verifyAuth();

	const existingResult = await GroupsService.getByOwnerId(user.id);
	if (existingResult.err) throw existingResult.val;
	const existing = existingResult.val;
	if (existing) invalid('You can only own one group');

	const createResult = await GroupsService.create({
		id: randomUUID(),
		ownerId: user.id,
		memberLimit: 25,
		...data,
	});
	if (createResult.err) throw createResult.val;
	const group = createResult.val;

	redirect(303, `/groups/${group.id}`);
});

export const updateGroup = form(GroupSchema.partial(), async (data) => {
	const {
		params: { group_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!group_id) error(400, 'A group ID is required');

	const groupResult = await GroupsService.getByIdForOwner(group_id, user.id);
	if (groupResult.err) throw groupResult.val;
	const group = groupResult.val;

	if (!group) error(400, 'Invalid group ID provided');

	const updateResult = await GroupsService.updateById(group_id, data);
	if (updateResult.err) throw updateResult.val;
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

		const groupResult = await GroupsService.getByIdForOwner(group_id, user.id);
		if (groupResult.err) throw groupResult.val;
		const group = groupResult.val;

		if (!group) error(400, 'Invalid group ID provided');

		const deleteResult = await GroupsService.deleteById(group.id);
		if (deleteResult.err) throw deleteResult.val;
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

		const groupResult = await GroupsService.getByIdWithInviteCountsForOwner(
			group_id,
			user.id,
		);
		if (groupResult.err) throw groupResult.val;
		const group = groupResult.val;

		if (!group) error(400, 'Invalid group ID provided');
		if (group.memberCount >= group.memberLimit) invalid('The group is alrady full');
		else if (group.memberCount + group.inviteCount >= group.memberLimit)
			invalid('Too many pending invites');

		const existingUserResult = await UsersService.getByEmail(targetEmail);
		if (existingUserResult.err) throw existingUserResult.val;
		const existingUser = existingUserResult.val;

		if (existingUser) {
			const existingMembershipResult = await GroupsService.getMembershipByGroupIdAndUserId(
				group.id,
				existingUser.id,
			);
			if (existingMembershipResult.err) throw existingMembershipResult.val;
			const existingMembership = existingMembershipResult.val;

			if (existingMembership) invalid('User is already a member');
		}

		const existingInviteResult = await GroupsService.getInviteByGroupIdAndEmail(
			group.id,
			targetEmail,
		);
		if (existingInviteResult.err) throw existingInviteResult.val;
		const existingInvite = existingInviteResult.val;

		if (existingInvite) invalid('User is already invited');

		const secret = randomUUID();
		const inviteResult = await GroupsService.createInvite({
			groupId: group.id,
			targetEmail,
			id: secret,
		});
		if (inviteResult.err) throw inviteResult.val;
		const [createdInvite] = inviteResult.val;

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

	const groupResult = await GroupsService.getByIdForOwner(group_id, user.id);
	if (groupResult.err) throw groupResult.val;
	const group = groupResult.val;

	if (!group) error(400, 'Invalid group ID provided');

	const deleteResult = await GroupsService.deleteInviteById(inviteId);
	if (deleteResult.err) throw deleteResult.val;
	redirect(303, `/groups/${group.id}`);
});

export const resolveGroupInvite = form(
	z.object({ inviteId: z.string(), decision: z.enum(['accept', 'decline']) }),
	async ({ inviteId, decision }, invalid) => {
		const user = await resolveMe({});
		if (!user) error(401);

		const inviteResult = await GroupsService.getInviteById(inviteId);
		if (inviteResult.err) throw inviteResult.val;
		const invite = inviteResult.val;

		if (!invite) return invalid(invalid.inviteId('Invite invalid or expired'));
		if (invite.targetEmail !== user.email) invalid(invalid.inviteId('This is not your invite'));

		if (decision === 'decline') {
			const deleteResult = await GroupsService.deleteInviteById(invite.id);
			if (deleteResult.err) throw deleteResult.val;
			redirect(303, `/`);
		}

		const groupResult = await GroupsService.getByIdWithMemberCount(invite.groupId);
		if (groupResult.err) throw groupResult.val;
		const group = groupResult.val;

		if (!group) return invalid(invalid.inviteId('Group does not exist'));
		if (group.memberCount >= group.memberLimit)
			return invalid(invalid.inviteId('Group is full'));

		const acceptResult = await GroupsService.acceptInvite(
			invite.groupId,
			user.id,
			invite.id,
		);
		if (acceptResult.err) throw acceptResult.val;

		redirect(303, `/`);
	},
);

export const removeGroupMember = form(z.object({ targetId: z.string() }), async ({ targetId }) => {
	const {
		params: { group_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!group_id) error(400, 'A group ID is required');

	const groupResult = await GroupsService.getById(group_id);
	if (groupResult.err) throw groupResult.val;
	const group = groupResult.val;

	if (!group) error(400, 'Invalid group ID provided');

	if (group.ownerId === targetId) error(400, 'Cannot remove group owner');
	if (group.ownerId !== user.id && user.id !== targetId)
		error(401, 'Cannot modify other members of this group');

	const membershipResult = await GroupsService.getMembershipByGroupIdAndUserId(
		group.id,
		targetId,
	);
	if (membershipResult.err) throw membershipResult.val;
	const membership = membershipResult.val;

	if (!membership) error(400, 'User is not an active member');

	const deleteResult = await GroupsService.deleteMembershipByGroupIdAndUserId(
		group.id,
		targetId,
	);
	if (deleteResult.err) throw deleteResult.val;

	await cleanReservationsAfterGroupExit(targetId);

	redirect(303, `/groups/${group.id}`);
});

export const getMyInvites = query(async () => {
	const user = await resolveMe({});
	if (!user) return [];

	const invitesResult = await GroupsService.listInvitesByEmail(user.email);
	if (invitesResult.err) throw invitesResult.val;
	return invitesResult.val;
});

export const getGroupActivity = query(async () => {
	const user = verifyAuth();

	const membershipsResult = await GroupsService.listActivityByUserId(user.id);
	if (membershipsResult.err) throw membershipsResult.val;
	const memberships = membershipsResult.val;

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

export const getOwnedGroup = query(async () => {
	const user = verifyAuth();
	const groupResult = await GroupsService.getByOwnerId(user.id);
	if (groupResult.err) throw groupResult.val;
	return groupResult.val;
});

export const getGroupById = query(z.object({ groupId: z.string() }), async ({ groupId }) => {
	const groupResult = await GroupsService.getByIdWithOwner(groupId);
	if (groupResult.err) throw groupResult.val;
	return groupResult.val;
});

export const getGroupMembers = query(z.object({ groupId: z.string() }), async ({ groupId }) => {
	const membersResult = await GroupsService.listMembersWithListsByGroupId(groupId);
	if (membersResult.err) throw membersResult.val;
	return membersResult.val;
});

export const getGroupInvites = query(z.object({ groupId: z.string() }), async ({ groupId }) => {
	const invitesResult = await GroupsService.listInvitesByGroupId(groupId);
	if (invitesResult.err) throw invitesResult.val;
	return invitesResult.val;
});

export const getGroupInvite = query(z.object({ inviteId: z.string() }), async ({ inviteId }) => {
	const inviteResult = await GroupsService.getInviteByIdWithGroup(inviteId);
	if (inviteResult.err) throw inviteResult.val;
	return inviteResult.val;
});
