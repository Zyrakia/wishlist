<script>
	import InputGroup from '$lib/components/input-group.svelte';
	import { login } from '$lib/remotes/auth.remote.js';
	import { useHasJs } from '$lib/runes/has-js.svelte.js';
	import { CredentialsSchema } from '$lib/schemas/auth.js';
	import { EyeClosedIcon, EyeIcon } from '@lucide/svelte';

	const remote = login.preflight(CredentialsSchema.omit({ username: true }));
	const hasJs = useHasJs();

	let showPassword = $state(false);
</script>

<div class="flex-1 p-3 mx-auto container flex flex-col items-center justify-center">
	<h1 class="text-3xl">Welcome Back</h1>
	<p class="text-md pt-1">Sign in to get started</p>

	<form
		class="container mt-3 w-full flex flex-col gap-5 rounded"
		{...remote}
		oninput={() => remote.validate({ preflightOnly: true })}
	>
		<InputGroup label="Email" error={remote.fields.email.issues()}>
			{#snippet control()}
				<input {...remote.fields.email.as('text')} />
			{/snippet}
		</InputGroup>

		<InputGroup label="Password" error={remote.fields.password.issues()}>
			{#snippet control()}
				<div class="w-full relative flex gap-2">
					<input
						class="w-full"
						{...remote.fields.password.as(showPassword ? 'text' : 'password')}
					/>

					{#if hasJs()}
						<button type="button" onclick={() => (showPassword = !showPassword)}>
							{#if showPassword}
								<EyeIcon />
							{:else}
								<EyeClosedIcon />
							{/if}
						</button>
					{/if}
				</div>
			{/snippet}
		</InputGroup>

		<button class="bg-green-200" {...remote.buttonProps} disabled={!!remote.pending}>
			Login
		</button>

		{#if remote.fields.issues()?.length}
			<p>{remote.fields.issues()?.[0]?.message}</p>
		{/if}
	</form>
</div>
