<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import { register } from '$lib/remotes/auth.remote.js';
	import { useHasJs } from '$lib/runes/has-js.svelte.js';
	import { CreateCredentialsSchema } from '$lib/schemas/auth.js';
	import { EyeClosedIcon, EyeIcon } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	import backgroundImage from '$lib/assets/authentication-background.webp';
	import { asIssue } from '$lib/util/pick-issue';

	const hasJs = useHasJs();
	const getIssue = () => asIssue(remote.fields);

	const remote = register.preflight(CreateCredentialsSchema);

	let showPassword = $state(false);
	let issue = $state(getIssue());

	let issueClearTimeout: NodeJS.Timeout | undefined;
	$effect(() => {
		if (issue) {
			clearTimeout(issueClearTimeout);
			issueClearTimeout = setTimeout(() => {
				issue = undefined;
				issueClearTimeout = undefined;
			}, 5000);
		}
	});
</script>

<div
	style="background-image: url({backgroundImage}); background-color: rgba(0, 0, 0, 0.3);"
	class="relative flex h-full w-full justify-center bg-cover bg-bottom-right bg-no-repeat p-6 py-12 md:items-center md:justify-start md:p-12"
>
	<div class="absolute top-0 left-0 h-full w-full dark:bg-black/35"></div>

	<div class="z-10 container flex h-max max-w-2xl flex-col rounded-xl p-8 dark:bg-surface/90">
		<p class="mb-2 text-sm uppercase md:mb-4 md:text-lg">Register to get started</p>
		<h1 class="mb-6 text-3xl font-bold uppercase md:text-5xl">Create an Account</h1>
		<p>Already have an account? <a href="/login" class="text-accent">Login</a></p>

		<form
			{...remote}
			class="container mt-6 flex w-full flex-col gap-5 rounded"
			oninput={() => remote.validate({ preflightOnly: true })}
		>
			<InputGroup label="Email" error={remote.fields.email.issues()}>
				{#snippet control()}
					<input placeholder="Enter your email" {...remote.fields.email.as('text')} />
				{/snippet}
			</InputGroup>

			<InputGroup label="Username" error={remote.fields.username.issues()}>
				{#snippet control()}
					<input
						placeholder="Enter your preferred username"
						{...remote.fields.username.as('text')}
					/>
				{/snippet}
			</InputGroup>

			<InputGroup
				label="Password"
				error={remote.fields.password.issues() || remote.fields.passwordConfirm.issues()}
			>
				{#snippet control()}
					<div class="relative flex w-full flex-col gap-2 md:flex-row">
						<input
							class="bg- flex-1/2"
							placeholder="Enter your password"
							{...remote.fields.password.as(showPassword ? 'text' : 'password')}
						/>

						<div class="flex flex-2/3 gap-2">
							<input
								class="w-full"
								placeholder="Confirm your password"
								{...remote.fields.passwordConfirm.as(
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
				class="bg-success px-6 py-3 font-bold transition-colors text-accent-fg"
				class:bg-success={!hasJs() || !issue}
				class:bg-danger={hasJs() && issue}
				disabled={!!remote.pending}
				{...remote.buttonProps.enhance(async ({ submit }) => {
					try {
						issue = undefined;
						await submit();
					} finally {
						issue = getIssue();
					}
				})}
			>
				Register
			</button>

			<p
				class="font-bold0 rounded bg-danger px-6 py-2 text-center text-accent-fg transition-opacity"
				class:hidden={!issue}
			>
				<span in:fade={{ duration: 150 }} out:fade={{ duration: 150 }}>
					{issue}
				</span>
			</p>
		</form>
	</div>
</div>
