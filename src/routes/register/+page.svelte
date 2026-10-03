<script lang="ts">
	import AuthShell from '$lib/components/auth-shell.svelte';
	import InputGroup from '$lib/components/input-group.svelte';
	import PasswordInput from '$lib/components/password-input.svelte';
	import { register } from '$lib/remotes/auth.remote.js';
	import { CreateCredentialsSchema, CredentialsSchema } from '$lib/schemas/auth.js';
	import { ArrowRightIcon } from '@lucide/svelte';

	import { page } from '$app/state';
	import { UrlBuilder } from '$lib/util/url';

	const remote = register.preflight(CreateCredentialsSchema);

	const loginHref = UrlBuilder.from('/login')
		.query(Object.fromEntries(page.url.searchParams.entries()))
		.toPath();

	const { data: seededEmail } = CredentialsSchema.shape.email.safeParse(
		page.url.searchParams.get('email'),
	);
	if (seededEmail) remote.fields.email.set(seededEmail);
</script>

<AuthShell title="Create an account">
	<form
		{...remote}
		class="flex flex-col gap-5"
		oninput={() => remote.validate({ preflightOnly: true })}
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

		<InputGroup label="Username" error={remote.fields.username.issues()}>
			{#snippet control()}
				<input
					class="input-lg"
					placeholder="What should friends see?"
					autocomplete="username"
					{...remote.fields.username.as('text')}
				/>
			{/snippet}
		</InputGroup>

		<InputGroup label="Password" error={remote.fields.password.issues()}>
			{#snippet control()}
				<PasswordInput
					placeholder="At least 11 characters"
					autocomplete="new-password"
					field={remote.fields.password}
				/>
			{/snippet}
		</InputGroup>

		<InputGroup label="Confirm password" error={remote.fields.passwordConfirm.issues()}>
			{#snippet control()}
				<PasswordInput
					placeholder="Same password again"
					autocomplete="new-password"
					field={remote.fields.passwordConfirm}
				/>
			{/snippet}
		</InputGroup>

		<button class="button-brand mt-1" disabled={!!remote.pending} {...remote.buttonProps}>
			Create account <ArrowRightIcon size={18} />
		</button>
	</form>

	{#snippet alternate()}
		Already have an account?
		<a href={loginHref} class="font-bold text-brand hover:underline">Log in</a>
	{/snippet}
</AuthShell>
