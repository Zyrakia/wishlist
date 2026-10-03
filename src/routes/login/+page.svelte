<script lang="ts">
	import AuthShell from '$lib/components/auth-shell.svelte';
	import InputGroup from '$lib/components/input-group.svelte';
	import PasswordInput from '$lib/components/password-input.svelte';
	import { login } from '$lib/remotes/auth.remote.js';
	import { CredentialsSchema } from '$lib/schemas/auth';
	import { ArrowRightIcon } from '@lucide/svelte';

	import { page } from '$app/state';
	import { UrlBuilder } from '$lib/util/url';

	let { data } = $props();
	const remote = login.preflight(CredentialsSchema.omit({ username: true }));

	let issue = $state<string>();

	$effect(() => {
		const nextIssue = remote.result?.error;
		if (nextIssue) issue = nextIssue;
	});

	const resetPasswordHref = $derived.by(() => {
		const email = remote.fields.email.value();
		const path = UrlBuilder.from('/reset-password');
		if (email) path.param('email', email);
		return path.toPath();
	});

	const registerHref = UrlBuilder.from('/register')
		.query(Object.fromEntries(page.url.searchParams.entries()))
		.toPath();

	const { data: seededEmail } = CredentialsSchema.shape.email.safeParse(
		page.url.searchParams.get('email'),
	);
	if (seededEmail) remote.fields.email.set(seededEmail);
</script>

<AuthShell title="Welcome back">
	{#if data.updated === 'password'}
		<p class="mb-6 rounded-xl bg-success/15 px-4 py-3 text-sm" role="status">
			Your password has been updated.
		</p>
	{/if}

	<form
		{...remote}
		class="flex flex-col gap-5"
		oninput={() => {
			issue = undefined;
			remote.validate({ preflightOnly: true });
		}}
	>
		<InputGroup label="Email" error={remote.fields.email.issues()}>
			{#snippet control()}
				<input
					class="input-lg"
					placeholder="you@example.com"
					autocomplete="email"
					{...remote.fields.email.as('email')}
				/>
			{/snippet}
		</InputGroup>

		<InputGroup label="Password" error={remote.fields.password.issues()}>
			{#snippet control()}
				<PasswordInput
					placeholder="Your password"
					autocomplete="current-password"
					field={remote.fields.password}
				/>

				<a
					href={resetPasswordHref}
					class="ms-auto text-sm text-text-muted hover:text-brand"
				>
					Forgot password?
				</a>
			{/snippet}
		</InputGroup>

		{#if issue}
			<p class="rounded-xl bg-danger/15 px-4 py-3 text-sm" role="alert">{issue}</p>
		{/if}

		<button
			class="button-brand"
			disabled={!!remote.pending}
			{...remote.buttonProps.enhance(async ({ submit }) => {
				issue = undefined;
				await submit();
			})}
		>
			Log in <ArrowRightIcon size={18} />
		</button>
	</form>

	{#snippet alternate()}
		New here? <a href={registerHref} class="font-bold text-brand hover:underline"
			>Create an account</a
		>
	{/snippet}
</AuthShell>
