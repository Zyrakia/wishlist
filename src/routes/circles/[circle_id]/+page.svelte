<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import WishlistSummary from '$lib/components/wishlist-summary.svelte';
	import { issueCircleInvite, revokeCircleInvite } from '$lib/remotes/circle.remote.js';
	import { CredentialsSchema } from '$lib/schemas/auth.js';
	import { asIssue } from '$lib/util/pick-issue.js';
	import {
		CircleUserRoundIcon,
		MailQuestionMarkIcon,
		Settings2Icon,
		ShieldUserIcon,
		Trash2Icon,
		UsersIcon,
		XIcon,
	} from '@lucide/svelte';
	import z from 'zod';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const circle = $derived(data.circle);
	const isOwn = $derived(data.isOwn);
	const members = $derived(data.members);
	const pendingInvites = $derived(data.pendingInvites);

	const dtf = new Intl.DateTimeFormat(navigator.languages, {
		dateStyle: 'medium',
	});

	const isFull = $derived(members.length + pendingInvites.length >= circle.memberLimit);
</script>

{#snippet membersList()}
	<div class="flex flex-col">
		<h3 class="mb-2 flex items-center gap-2">
			<UsersIcon size={20} />

			<span class="text-xl font-semibold">Members </span>

			<span class:text-warning={isFull}>
				<span class="font-bold">[</span>
				{members.length}/{circle.memberLimit}
				<span class="font-bold">]</span>
			</span>

			{#if pendingInvites.length}
				<span class="font-light text-text-muted italic">
					+{pendingInvites.length} invited
				</span>
			{/if}
		</h3>

		<ul
			class="flex flex-col gap-4 divide-y divide-accent/50 border-s border-dashed border-border/75 ps-3"
		>
			{#each members as { user: member, joinedAt }}
				{@const isOwner = member.id === circle.ownerId}
				{@const isMe = member.id === data.user?.id}

				<div class="flex flex-col gap-2">
					<p
						class="flex gap-2 font-bold"
						title="Circle {isOwner ? 'Owner' : 'Member'}{isMe ? ' (You)' : ''}"
					>
						<span
							class={isMe ? 'text-success' : isOwner ? 'text-danger' : 'text-accent'}
						>
							{#if isOwner}
								<ShieldUserIcon />
							{:else}
								<CircleUserRoundIcon />
							{/if}
						</span>

						{member.name}
					</p>

					<p class="text-sm font-light text-text-muted">
						Member since: {dtf.format(joinedAt)}
					</p>

					<div
						class="grid grid-cols-1 gap-3 pt-2 pb-4 sm:grid-cols-[repeat(auto-fit,minmax(16rem,max-content))]"
					>
						{#if !member.wishlists.length}
							<p class="font-light text-text-muted italic">No wishlists...</p>
						{:else}
							{#each member.wishlists as wishlist}
								<WishlistSummary {wishlist} />
							{/each}
						{/if}
					</div>
				</div>
			{/each}
		</ul>
	</div>
{/snippet}

<div class="p-4">
	{#if isOwn}
		{@const inviteHandler = issueCircleInvite.preflight(
			z.object({ targetEmail: CredentialsSchema.shape.email }),
		)}

		<div class="md:reverse relative grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
			<div
				class="flex flex-col gap-4 rounded-md border-border py-2 lg:sticky lg:top-4 lg:order-2 lg:h-max"
			>
				<div class="flex w-full gap-2">
					<a
						href="/circles/{circle.id}/edit"
						class="button flex items-center justify-center gap-2"
					>
						<Settings2Icon size={20} />
						Edit
					</a>

					<a
						href="/circles/{circle.id}/delete-confirm"
						class="button ms-auto border-danger text-danger"
					>
						<Trash2Icon size={20} />
					</a>
				</div>

				<div class="rounded-xl border border-border/50 p-4">
					<form
						{...inviteHandler}
						oninput={() => inviteHandler.validate()}
						class="flex flex-col gap-4"
					>
						<div class="flex items-end gap-2">
							<InputGroup
								label="Send Invite Email"
								error={asIssue(
									inviteHandler.fields.targetEmail.issues() ||
										inviteHandler.fields.allIssues(),
								)}
							>
								{#snippet control()}
									<input
										placeholder="Enter an email"
										{...inviteHandler.fields.targetEmail.as('text')}
									/>
								{/snippet}
							</InputGroup>

							<button
								{...inviteHandler.buttonProps}
								class="h-max bg-success py-2.5 text-accent-fg"
							>
								Invite
							</button>
						</div>
					</form>

					{#await pendingInvites then invites}
						{#if invites.length}
							<hr class="mt-4 mb-3 border-border" />

							<ul class="flex flex-col gap-1">
								{#each invites as invite}
									{@const revokeHandler = revokeCircleInvite.for(invite.id)}

									<li
										class="flex items-center gap-2 rounded-sm border border-border p-2"
										title="Invite Pending since {dtf.format(invite.createdAt)}"
									>
										<MailQuestionMarkIcon size={16} />

										<p>{invite.targetEmail}</p>

										<form {...revokeHandler} class="ms-auto">
											<input
												{...revokeHandler.fields.inviteId.as(
													'hidden',
													invite.id,
												)}
											/>

											<button
												title="Revoke Invite"
												class="flex items-center border-0 p-0 text-danger"
												{...revokeHandler.buttonProps}
											>
												<XIcon />
											</button>
										</form>
									</li>
								{/each}
							</ul>
						{/if}
					{/await}
				</div>
			</div>

			{@render membersList()}
		</div>
	{:else}
		{@render membersList()}
	{/if}
</div>
