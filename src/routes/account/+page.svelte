<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import { changeEmailStart, changeName, changePassword } from '$lib/remotes/auth.remote.js';
	import {
		ChangePasswordSchema,
		CreateCredentialsSchema,
		CredentialsSchema,
	} from '$lib/schemas/auth.js';
	import { formatDate, formatRelative } from '$lib/util/date';
	import { asIssue } from '$lib/util/pick-issue.js';
	import {
		ClockIcon,
		LockIcon,
		MailIcon,
		PenIcon,
		PenOffIcon,
		SquareUserRoundIcon,
	} from '@lucide/svelte';

	let { data } = $props();

	const me = $derived(data.me);
	const editMode = $derived(data.change);

	const createdDate = $derived(formatDate(me.createdAt, 'mediumDt'));
	const accountAge = $derived.by(() => formatRelative(me.createdAt));

	let showPasswords = $state(false);
</script>

<div class="grid min-h-full w-full place-items-center bg-background">
	<div class="float-container my-0 flex min-h-6/8 flex-col bg-surface p-8">
		{#if data.notice}
			<p class="mb-4 rounded-sm border border-border bg-accent/15 px-3 py-2 shadow">
				{data.notice}
			</p>
		{/if}

		<h1 class="text-2xl font-bold">Your Account</h1>

		<hr class="mt-1 mb-4" />

		<div class="mb-4 flex flex-wrap gap-4">
			<div
				class="flex w-full flex-col gap-4 rounded-md border border-border p-4 shadow-md"
				class:border-border={editMode !== 'name'}
				class:border-accent={editMode === 'name'}
			>
				<div class="flex flex-1 justify-between">
					<div class="flex items-center gap-2">
						<SquareUserRoundIcon />

						<p class="font-bold">Username</p>
					</div>

					{#if editMode === 'name'}
						<a href="/account" class="button border-none p-1" title="Cancel Change">
							<PenOffIcon size={20} class="text-danger" />
						</a>
					{:else}
						<a
							href="?change=name"
							class="button border-none p-1"
							title="Change Username"
						>
							<PenIcon size={20} />
						</a>
					{/if}
				</div>

				{#if editMode === 'name'}
					{@const handler = changeName.preflight(
						CreateCredentialsSchema.pick({ username: true }),
					)}

					<form
						{...handler}
						oninput={() => handler.validate()}
						class="flex flex-col gap-2 md:flex-row md:items-end"
					>
						<InputGroup label="Change Username" error={handler.fields.allIssues()}>
							{#snippet control()}
								<input
									placeholder={me.name}
									{...handler.fields.username.as('text')}
								/>
							{/snippet}
						</InputGroup>

						<button
							{...handler.buttonProps}
							title="Save"
							class="border-border-strong bg-success py-2.5 text-accent-fg"
						>
							Save
						</button>
					</form>
				{:else}
					<p class="flex-1 font-light wrap-break-word whitespace-pre-wrap">
						{me.name}
					</p>
				{/if}
			</div>

			<div
				class="flex w-full flex-col gap-4 rounded-md border p-4 shadow-md"
				class:border-border={editMode !== 'email'}
				class:border-accent={editMode === 'email'}
			>
				<div class="flex flex-1 justify-between">
					<div class="flex items-center gap-2">
						<MailIcon />

						<p class="font-bold">Email</p>
					</div>

					{#if editMode === 'email'}
						<a href="/account" class="button border-none p-1" title="Cancel Change">
							<PenOffIcon size={20} class="text-danger" />
						</a>
					{:else}
						<a href="?change=email" class="button border-none p-1" title="Change Email">
							<PenIcon size={20} />
						</a>
					{/if}
				</div>

				{#if editMode === 'email'}
					{@const handler = changeEmailStart.preflight(
						CredentialsSchema.pick({ email: true }),
					)}

					<form
						{...handler}
						oninput={() => handler.validate()}
						class="flex flex-col gap-2 md:flex-row md:items-end"
					>
						<InputGroup
							label="Change Email"
							error={asIssue(handler.fields.allIssues())}
						>
							{#snippet control()}
								<input
									placeholder={me.email}
									{...handler.fields.email.as('text')}
								/>
							{/snippet}
						</InputGroup>

						<button
							{...handler.buttonProps}
							disabled={!!handler.pending}
							title="Save"
							class="border-border-strong bg-success py-2.5 text-accent-fg"
						>
							Save
						</button>
					</form>
				{:else}
					<p class="flex-1 truncate font-light">
						{me.email}
					</p>
				{/if}
			</div>

			<div
				class="flex w-full flex-col gap-4 rounded-md border border-border p-4 shadow-md"
				class:border-border={editMode !== 'password'}
				class:border-accent={editMode === 'password'}
			>
				<div class="flex flex-1 justify-between">
					<div class="flex items-center gap-2">
						<LockIcon />

						<p class="font-bold">Password</p>
					</div>

					{#if editMode === 'password'}
						<a href="/account" class="button border-none p-1" title="Cancel Change">
							<PenOffIcon size={20} class="text-danger" />
						</a>
					{:else}
						<a
							href="?change=password"
							class="button border-none p-1"
							title="Change Password"
						>
							<PenIcon size={20} />
						</a>
					{/if}
				</div>

				{#if editMode === 'password'}
					{@const handler = changePassword.preflight(ChangePasswordSchema)}

					<form
						{...handler}
						oninput={() => handler.validate()}
						class="flex flex-col gap-2"
					>
						<InputGroup
							label="Current Password"
							error={asIssue(
								handler.fields.oldPassword.issues() || handler.fields.issues(),
							)}
						>
							{#snippet control()}
								<input
									{...handler.fields.oldPassword.as(
										showPasswords ? 'text' : 'password',
									)}
								/>
							{/snippet}
						</InputGroup>

						<div class="flex flex-wrap gap-2 md:flex-nowrap">
							<InputGroup
								label="New Password"
								error={handler.fields.password.issues()}
							>
								{#snippet control()}
									<input
										{...handler.fields.password.as(
											showPasswords ? 'text' : 'password',
										)}
									/>
								{/snippet}
							</InputGroup>

							<InputGroup
								label="Confirm Password"
								error={handler.fields.passwordConfirm.issues()}
							>
								{#snippet control()}
									<input
										{...handler.fields.passwordConfirm.as(
											showPasswords ? 'text' : 'password',
										)}
									/>
								{/snippet}
							</InputGroup>
						</div>

						<button {...handler.buttonProps} class="bg-success text-accent-fg"
							>Confirm Change</button
						>
					</form>
				{:else}
					<p class="font-light text-danger/80 italic">*********</p>
				{/if}
			</div>

			<div class="flex w-full flex-col gap-4 rounded-md border border-border p-4 shadow-md">
				<div class="flex flex-1 items-center gap-2">
					<ClockIcon />

					<p class="font-bold">Account Created</p>
				</div>

				<p class="flex flex-wrap gap-3 font-light">
					{accountAge}
					<span class="italic">
						( {createdDate} )
					</span>
				</p>
			</div>
		</div>

		<a class="button mt-auto bg-danger text-center dark:text-accent-fg" href="/logout">
			Logout
		</a>
	</div>
</div>
