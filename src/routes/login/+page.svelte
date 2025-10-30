<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import { login } from '$lib/remotes/auth.remote.js';
	import { useHasJs } from '$lib/runes/has-js.svelte.js';
	import { CredentialsSchema } from '$lib/schemas/auth.js';
	import { EyeClosedIcon, EyeIcon } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	import backgroundImage from '$lib/assets/authentication-background.webp';

	const hasJs = useHasJs();
	const getIssue = () => remote.fields.issues()?.[0]?.message;

	const remote = login.preflight(CredentialsSchema.omit({ username: true }));

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
	style="background-image: url({backgroundImage});"
	class="flex-1 p-6 py-12 md:p-12 flex md:items-center justify-center md:justify-start bg-no-repeat bg-right bg-cover"
>
	<div class="container max-w-2xl flex flex-col">
		<p class="text-sm md:text-lg mb-2 md:mb-4 text-neutral-600 uppercase">
			Sign in to get started
		</p>
		<h1 class="text-3xl md:text-5xl mb-6 font-bold uppercase">Welcome Back</h1>
		<p>Don't have an account yet? <a href="/register" class="text-blue-600">Create One</a></p>

		<form
			{...remote}
			class="container mt-6 w-full flex flex-col gap-5 rounded"
			oninput={() => remote.validate({ preflightOnly: true })}
		>
			<InputGroup label="Email" error={remote.fields.email.issues()}>
				{#snippet control()}
					<input class="bg-white" {...remote.fields.email.as('text')} />
				{/snippet}
			</InputGroup>

			<InputGroup label="Password" error={remote.fields.password.issues()}>
				{#snippet control()}
					<div class="w-full relative flex gap-2">
						<input
							class="w-full bg-white"
							{...remote.fields.password.as(showPassword ? 'text' : 'password')}
						/>

						{#if hasJs()}
							<button
								title={showPassword ? 'Hide Password' : 'Show Password'}
								class="button px-3 bg-white"
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
				{/snippet}
			</InputGroup>

			<button
				class="bg-emerald-200 px-6 py-3 font-bold transition-colors"
				class:bg-emerald-200={!hasJs() || !issue}
				class:bg-red-200={hasJs() && issue}
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
				Login
			</button>

			<p
				class="transition-opacity font-bold text-center opacity-0 bg-red-200 px-6 py-2 rounded"
				class:opacity-100={!!issue}
			>
				{#if issue}
					<span in:fade={{ duration: 150 }} out:fade={{ duration: 150 }}>
						{issue}
					</span>
				{:else}
					<br />
				{/if}
			</p>
		</form>
	</div>
</div>
