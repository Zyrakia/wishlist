<script lang="ts">
	import { page } from '$app/state';
	import { resolveCircleInvite } from '$lib/remotes/circle.remote';
	import { asIssue } from '$lib/util/pick-issue';
	import { CircleIcon, TriangleAlertIcon } from '@lucide/svelte';

	let { data } = $props();

	const invite = $derived(data.invite);
	const me = $derived(data.me);

	const returnPath = page.url.pathname;
</script>

<div class="flex h-full w-full items-center justify-center">
	{#if !invite}
		<div class="flex flex-col items-center gap-4">
			<TriangleAlertIcon class="text-danger" size={32} />

			<h1 class="flex gap-3 text-3xl text-danger capitalize">Invalid invite</h1>

			<p class="text-text-muted">It looks like this invite link is invalid or has expired!</p>

			<a href="/" class="button bg-success text-accent-fg">Return Home</a>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4">
			<p>You have been invited to join</p>

			<h1 class="max-w-full text-3xl font-bold text-success">{invite.circle.name}</h1>

			<hr class="w-full border-border" />

			{#if me}
				{#if me.email === invite.targetEmail}
					{@const issue = asIssue(resolveCircleInvite.fields.allIssues())}

					<form {...resolveCircleInvite} class="flex gap-3">
						<input {...resolveCircleInvite.fields.inviteId.as('hidden', invite.id)} />

						<button name="decision" value="accept" class="bg-success text-accent-fg">
							Accept
						</button>

						<button name="decision" value="decline" class="bg-danger text-accent-fg">
							Decline
						</button>
					</form>

					{#if issue}
						<p class="text-sm text-danger">{issue}</p>
					{/if}
				{:else}
					<p class="text-warning">This is not your invite.</p>

					<a
						href="/login?email={invite.targetEmail}&redirect={returnPath}"
						class="button bg-accent text-accent-fg"
					>
						Change Account
					</a>
				{/if}
			{:else}
				<p class="text-warning">You must be signed in to accept this invite.</p>

				<div class="flex gap-3">
					<a
						href="/register?email={invite.targetEmail}&redirect={returnPath}"
						class="button bg-success text-accent-fg"
					>
						Create Account
					</a>

					<a
						href="/login?email={invite.targetEmail}&redirect={returnPath}"
						class="button bg-accent text-accent-fg"
					>
						Log In
					</a>
				</div>
			{/if}
		</div>
	{/if}
</div>
