<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import { login } from '$lib/remotes/auth.remote.js';
	import { useHasJs } from '$lib/runes/has-js.svelte.js';
	import { CreateCredentialsSchema, CredentialsSchema } from '$lib/schemas/auth';
	import { EyeClosedIcon, EyeIcon } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	import backgroundImage from '$lib/assets/authentication-background.webp';
	import { asIssue } from '$lib/util/pick-issue';
	import { page } from '$app/state';
	import { safePrune } from '$lib/util/safe-prune';

	const hasJs = useHasJs();
	const getIssue = () => asIssue(remote.fields);

	let { data } = $props();
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

	const seed = (props: Record<string, string>) => {
		const validProps = safePrune(CreateCredentialsSchema.partial(), props);
		remote.fields.set(validProps as any);
	};

	seed(Object.fromEntries(page.url.searchParams.entries()));
</script>

<div
	style="background-image: url({backgroundImage}); background-color: rgba(0, 0, 0, 0.3);"
	class="relative flex h-full w-full justify-center bg-cover bg-bottom-right bg-no-repeat p-6 py-12 md:items-center md:justify-start md:p-12"
>
	<div class="absolute top-0 left-0 h-full w-full dark:bg-black/35"></div>

	<div
		class="z-10 container flex h-max max-w-2xl flex-col rounded-xl border border-border bg-surface/90 p-8 shadow-lg"
	>
		{#if data.updated === 'password'}
			<p
				class="mb-4 w-full rounded border border-border bg-accent/10 p-3 text-accent-fg shadow-sm dark:text-success"
			>
				Your password has been updated.
			</p>
		{/if}

		<p class="mb-2 text-sm uppercase md:mb-4 md:text-lg">Sign in to get started</p>
		<h1 class="mb-6 text-3xl font-bold uppercase md:text-5xl">Welcome Back</h1>
		<p>
			Don't have an account yet? <a href="/register{page.url.search}" class="text-accent"
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
					<input placeholder="Enter your email" {...remote.fields.email.as('text')} />
				{/snippet}
			</InputGroup>

			<InputGroup label="Password" error={remote.fields.password.issues()}>
				{#snippet control()}
					<div class="relative flex w-full gap-2">
						<input
							class="w-full"
							placeholder="Enter your password"
							{...remote.fields.password.as(showPassword ? 'text' : 'password')}
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

					<a
						href="/reset-password{remote.fields.email.value()
							? `?email=${encodeURIComponent(remote.fields.email.value())}`
							: ''}"
						class="text-sm text-accent/75 italic"
					>
						Forgot password?
					</a>
				{/snippet}
			</InputGroup>

			<button
				class="bg-success px-6 py-3 font-bold text-accent-fg transition-colors"
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
				Login
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
