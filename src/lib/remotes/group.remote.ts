import { form, getRequestEvent, query } from '$app/server';
import { CredentialsSchema } from '$lib/schemas/auth';
import { GroupSchema } from '$lib/schemas/group';
import { verifyAuth } from '$lib/server/auth';
import { sendEmail } from '$lib/server/email';
import { GroupsService } from '$lib/server/services/groups';
import { UsersService } from '$lib/server/services/users';
import { $unwrap } from '$lib/util/result';
import { strBoolean } from '$lib/util/zod';
import { randomUUID } from 'crypto';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

import { resolveMe } from './auth.remote';
import { cleanReservationsAfterGroupExit } from '$lib/server/reservations';

export const createGroup = form(GroupSchema, async (data, invalid) => {
	const user = verifyAuth();

	const existing = $unwrap(await GroupsService.getGroupByOwner(user.id));
	if (existing) invalid('You can only own one group');

	const group = $unwrap(
		await GroupsService.createGroup({
			id: randomUUID(),
			ownerId: user.id,
			memberLimit: 25,
			...data,
		}),
	);

	redirect(303, `/groups/${group.id}`);
});

export const updateGroup = form(GroupSchema.partial(), async (data) => {
	const {
		params: { group_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!group_id) error(400, 'A group ID is required');

	const group = $unwrap(await GroupsService.getOwnedGroupById(group_id, user.id));

	if (!group) error(400, 'Invalid group ID provided');

	$unwrap(await GroupsService.updateGroup(group_id, data));
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

		const group = $unwrap(await GroupsService.getOwnedGroupById(group_id, user.id));

		if (!group) error(400, 'Invalid group ID provided');

		$unwrap(await GroupsService.deleteGroup(group.id));
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

		const group = $unwrap(await GroupsService.getGroupWithInviteCounts(group_id, user.id));

		if (!group) error(400, 'Invalid group ID provided');
		if (group.memberCount >= group.memberLimit) invalid('The group is alrady full');
		else if (group.memberCount + group.inviteCount >= group.memberLimit)
			invalid('Too many pending invites');

		const existingUser = $unwrap(await UsersService.getByEmail(targetEmail));

		if (existingUser) {
			const existingMembership = $unwrap(
				await GroupsService.getMembershipByGroupAndUser(group.id, existingUser.id),
			);

			if (existingMembership) invalid('User is already a member');
		}

		const existingInvite = $unwrap(
			await GroupsService.getInviteByGroupAndEmail(group.id, targetEmail),
		);

		if (existingInvite) invalid('User is already invited');

		const secret = randomUUID();
		const [createdInvite] = $unwrap(
			await GroupsService.createInvite({ groupId: group.id, targetEmail, id: secret }),
		);

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

	const group = $unwrap(await GroupsService.getOwnedGroupById(group_id, user.id));

	if (!group) error(400, 'Invalid group ID provided');

	$unwrap(await GroupsService.deleteInviteById(inviteId));
	redirect(303, `/groups/${group.id}`);
});

export const resolveGroupInvite = form(
	z.object({ inviteId: z.string(), decision: z.enum(['accept', 'decline']) }),
	async ({ inviteId, decision }, invalid) => {
		const user = await resolveMe({});
		if (!user) error(401);

		const invite = $unwrap(await GroupsService.getInviteById(inviteId));

		if (!invite) return invalid(invalid.inviteId('Invite invalid or expired'));
		if (invite.targetEmail !== user.email) invalid(invalid.inviteId('This is not your invite'));

		if (decision === 'decline') {
			$unwrap(await GroupsService.deleteInviteById(invite.id));
			redirect(303, `/`);
		}

		const group = $unwrap(await GroupsService.getGroupWithMemberCount(invite.groupId));

		if (!group) return invalid(invalid.inviteId('Group does not exist'));
		if (group.memberCount >= group.memberLimit)
			return invalid(invalid.inviteId('Group is full'));

		$unwrap(await GroupsService.acceptInvite(invite.groupId, user.id, invite.id));

		redirect(303, `/`);
	},
);

export const removeGroupMember = form(z.object({ targetId: z.string() }), async ({ targetId }) => {
	const {
		params: { group_id },
	} = getRequestEvent();

	const user = verifyAuth();
	if (!group_id) error(400, 'A group ID is required');

	const group = $unwrap(await GroupsService.getGroupById(group_id));

	if (!group) error(400, 'Invalid group ID provided');

	if (group.ownerId === targetId) error(400, 'Cannot remove group owner');
	if (group.ownerId !== user.id && user.id !== targetId)
		error(401, 'Cannot modify other members of this group');

	const membership = $unwrap(await GroupsService.getMembershipByGroupAndUser(group.id, targetId));

	if (!membership) error(400, 'User is not an active member');

	$unwrap(await GroupsService.deleteMembership(group.id, targetId));

	await cleanReservationsAfterGroupExit(targetId);

	redirect(303, `/groups/${group.id}`);
});

export const getMyInvites = query(async () => {
	const user = await resolveMe({});
	if (!user) return [];

	return $unwrap(await GroupsService.getInvitesForEmail(user.email));
});

export const getGroupActivity = query(async () => {
	const user = verifyAuth();

	const memberships = $unwrap(await GroupsService.getGroupActivity(user.id));

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
	return $unwrap(await GroupsService.getGroupByOwner(user.id));
});

export const getGroupById = query(z.object({ groupId: z.string() }), async ({ groupId }) => {
	return $unwrap(await GroupsService.getGroupWithOwner(groupId));
});

export const getGroupMembers = query(z.object({ groupId: z.string() }), async ({ groupId }) => {
	return $unwrap(await GroupsService.getMembersWithLists(groupId));
});

export const getGroupInvites = query(z.object({ groupId: z.string() }), async ({ groupId }) => {
	return $unwrap(await GroupsService.getInvitesByGroup(groupId));
});

export const getGroupInvite = query(z.object({ inviteId: z.string() }), async ({ inviteId }) => {
	return $unwrap(await GroupsService.getInviteWithGroup(inviteId));
});
