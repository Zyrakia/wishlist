<script>
	import InputGroup from '$lib/components/input-group.svelte';
	import { resetPassword } from '$lib/remotes/auth.remote.js';
	import { useHasJs } from '$lib/runes/has-js.svelte.js';
	import { ResetPasswordSchema } from '$lib/schemas/auth.js';
	import { firstIssue } from '$lib/util/issue.js';
	import { EyeClosedIcon, EyeIcon, TriangleAlertIcon } from '@lucide/svelte';

	let { data } = $props();
	const handler = resetPassword.preflight(ResetPasswordSchema);

	const hasJs = useHasJs();
	let showPassword = $state(false);
</script>

<div class="grid h-full w-full place-items-center">
	{#if data.email}
		<div class="float-container p-4">
			<form {...handler} class="flex flex-col gap-4" oninput={() => handler.validate()}>
				<input {...handler.fields.actionToken.as('hidden', data.token)} />

				<InputGroup label="Email" error={firstIssue(handler.fields.issues())}>
					{#snippet control()}
						<input
							type="email"
							name="email"
							id="email"
							disabled
							value={data.email}
							class="text-text-muted opacity-75"
						/>
					{/snippet}
				</InputGroup>

				<InputGroup
					label="New Password"
					error={handler.fields.password.issues() ||
						handler.fields.passwordConfirm.issues()}
				>
					{#snippet control()}
						<div class="relative flex w-full flex-col gap-2 md:flex-row">
							<input
								class="bg- flex-1/2"
								placeholder="Enter your new password"
								{...handler.fields.password.as(showPassword ? 'text' : 'password')}
							/>

							<div class="flex flex-2/3 gap-2">
								<input
									class="w-full"
									placeholder="Confirm your password"
									{...handler.fields.passwordConfirm.as(
										showPassword ? 'text' : 'password',
									)}
								/>

								{#if hasJs()}
									<button
										title={showPassword ? 'Hide Password' : 'Show Password'}
										class="button bg-accent px-3 dark:text-accent-fg"
										type="button"
										onclick={() => (showPassword = !showPassword)}
									>
										{#if showPassword}
											<EyeIcon />
										{:else}
											<EyeClosedIcon />
										{/if}
									</button>
								{/if}
							</div>
						</div>
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
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4 p-4">
			<TriangleAlertIcon size={48} class="text-danger" />

			<p>Your password reset link has most likely expired.</p>

			<a href="/reset-password" class="button bg-success text-accent-fg">Get New Link</a>
		</div>
	{/if}
</div>
