<script>
	import InputGroup from '$lib/components/input-group.svelte';
	import { resetPasswordStart } from '$lib/remotes/auth.remote.js';
	import { CredentialsSchema } from '$lib/schemas/auth.js';
	import { asIssue } from '$lib/util/pick-issue.js';
	import { CheckIcon } from '@lucide/svelte';
	import z from 'zod';

	let { data } = $props();
	const handler = resetPasswordStart.preflight(
		z.object({ email: CredentialsSchema.shape.email }),
	);
</script>

<div class="grid h-full w-full place-items-center">
	<div class="float-container p-4">
		<form class="flex flex-col gap-4" {...handler} oninput={() => handler.validate()}>
			<InputGroup
				label="Your Email"
				error={asIssue(handler.fields.email) || asIssue(handler.fields.issues())}
			>
				{#snippet control()}
					<input
						placeholder="Enter your account email"
						{...handler.fields.email.as('text')}
						value={data.email}
					/>
				{/snippet}
			</InputGroup>

			<button
				{...handler.buttonProps}
				disabled={!!handler.pending}
				class="button bg-success text-accent-fg"
			>
				Reset Password
			</button>
		</form>

		{#if handler.result?.success}
			<hr class="mt-4 mb-3" />

			<p class="flex gap-2 text-text-muted">
				<CheckIcon class="text-success" size={20} />

				If an associated account was found, the specified email will received a password
				reset email.
			</p>
		{/if}
	</div>
</div>
