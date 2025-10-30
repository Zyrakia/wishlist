<script lang="ts">
	import InputGroup from '$lib/components/input-group.svelte';
	import { login } from '$lib/remotes/auth.remote.js';
	import { useHasJs } from '$lib/runes/has-js.svelte.js';
	import { CredentialsSchema } from '$lib/schemas/auth.js';
	import { EyeClosedIcon, EyeIcon } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	const hasJs = useHasJs();

	const getIssue = () => remote.fields.issues()?.[0].message;

	const remote = login.preflight(CredentialsSchema.omit({ username: true }));
	let showPassword = $state(false);

	let issue = $state<string | undefined>(getIssue());
	let issueClearTimeout: NodeJS.Timeout | undefined;
	$effect(() => {
		issue;

		clearTimeout(issueClearTimeout);
		issueClearTimeout = setTimeout(() => {
			issueClearTimeout = undefined;
			issue = undefined;
		}, 5000);
	});
</script>

<div class="flex-1 p-3 flex items-center justify-center bg-linear-to-br to-30% from-emerald-50 to-gray-300">
	<div
		class="mx-auto container max-w-3xl flex flex-col items-center justify-center bg-white px-12 py-16 rounded-xl shadow-xl"
	>
		<h1 class="text-3xl">Welcome Back</h1>
		<p class="text-md pt-1">Sign in to get started</p>

		<p class="transition-opacity text-red-400 font-bold mt-5 self-start" class:opacity-100={!!issue}>
			{#if issue}
				<span in:fade={{ duration: 150 }} out:fade={{ duration: 150 }}>
					{issue}
				</span>
			{:else}
				<br />
			{/if}
		</p>

		<form
			class="container mt-6 w-full flex flex-col gap-5 rounded"
			oninput={() => remote.validate({ preflightOnly: true })}
			{...remote}
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
							<button
								title="Show Password"
								class="button"
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

			<button class="bg-green-200" {...remote.buttonProps} disabled={!!remote.pending}> Login </button>
		</form>
	</div>
</div>
