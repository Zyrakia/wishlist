<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import { login } from '$lib/remotes/auth.remote.js';
	import { useHasJs } from '$lib/runes/has-js.svelte.js';
	import { CredentialsSchema } from '$lib/schemas/auth.js';
	import { EyeClosedIcon, EyeIcon } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	import backgroundImage from '$lib/assets/authentication-background.webp';
	import { asIssue } from '$lib/util/pick-issue';
	import { page } from '$app/state';

	const hasJs = useHasJs();
	const getIssue = () => asIssue(remote.fields);

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
	class="flex h-full w-full justify-center bg-cover bg-bottom-right bg-no-repeat p-6 py-12 md:items-center md:justify-start md:p-12"
>
	<div class="container flex max-w-2xl flex-col">
		<p class="mb-2 text-sm text-neutral-600 uppercase md:mb-4 md:text-lg">
			Sign in to get started
		</p>
		<h1 class="mb-6 text-3xl font-bold uppercase md:text-5xl">Welcome Back</h1>
		<p>
			Don't have an account yet? <a href="/register{page.url.search}" class="text-blue-600"
				>Create One</a
			>
		</p>

		<form
			{...remote}
			class="container mt-6 flex w-full flex-col gap-5 rounded"
			oninput={() => remote.validate({ preflightOnly: true })}
		>
			<InputGroup label="Email" error={remote.fields.email.issues()}>
				{#snippet control()}
					<input
						class="bg-white"
						placeholder="Enter your email"
						{...remote.fields.email.as('text')}
					/>
				{/snippet}
			</InputGroup>

			<InputGroup label="Password" error={remote.fields.password.issues()}>
				{#snippet control()}
					<div class="relative flex w-full gap-2">
						<input
							class="w-full bg-white"
							placeholder="Enter your password"
							{...remote.fields.password.as(showPassword ? 'text' : 'password')}
						/>

						{#if hasJs()}
							<button
								title={showPassword ? 'Hide Password' : 'Show Password'}
								class="button bg-white px-3"
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
				class="rounded bg-red-200 px-6 py-2 text-center font-bold opacity-0 transition-opacity"
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
