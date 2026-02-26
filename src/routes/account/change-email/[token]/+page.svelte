<script>
	import InputGroup from '$lib/components/input-group.svelte';
	import { changeEmail } from '$lib/remotes/auth.remote.js';
	import { firstIssue } from '$lib/util/issue.js';
	import { TriangleAlertIcon } from '@lucide/svelte';

	let { data } = $props();
</script>

<div class="grid h-full w-full place-items-center">
	{#if data.newEmail}
		<div class="float-container p-4">
			<form
				{...changeEmail}
				class="flex flex-col gap-4"
				oninput={() => changeEmail.validate()}
			>
				<input {...changeEmail.fields.token.as('hidden', data.token)} />

				<InputGroup label="New Email" error={firstIssue(changeEmail.fields.issues())}>
					{#snippet control()}
						<input
							type="email"
							name="email"
							id="email"
							disabled
							value={data.newEmail}
							class="text-text-muted opacity-75"
						/>
					{/snippet}
				</InputGroup>

				<button
					{...changeEmail.buttonProps}
					disabled={!!changeEmail.pending}
					class="button bg-success text-accent-fg"
				>
					Confirm Change
				</button>
			</form>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4 p-4">
			<TriangleAlertIcon size={48} class="text-danger" />

			<p>Your email change link has most likely expired.</p>

			<a href="/account" class="button bg-success text-accent-fg">Return to Account</a>
		</div>
	{/if}
</div>
