<script lang="ts">
	import { changeEmailStart } from '$lib/remotes/auth.remote';
	import { clock } from '$lib/runes/clock.svelte';
	import { formatRelative } from '$lib/util/date.js';
	import { ClockIcon, Edit2Icon, MailIcon, SquarePenIcon, UserIcon } from '@lucide/svelte';

	let { data } = $props();

	const me = $derived(data.me);
	const mode = $derived(data.mode);

	const dtf = new Intl.DateTimeFormat(navigator.languages, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});

	const createdDate = $derived(dtf.format(me.createdAt));
	const accountAge = $derived.by(() => formatRelative(me.createdAt, clock.now));
</script>

<div class="grid h-full w-full place-items-center bg-background">
	<div class="float-container my-0 flex min-h-6/8 flex-col bg-surface p-8">
		<h1 class="text-2xl font-bold">Your Account</h1>

		<hr class="mt-1 mb-4" />

		<div class="mb-4 flex flex-wrap gap-4">
			<div class="flex w-full flex-col gap-4 rounded-md border border-border p-4 shadow-md">
				<div class="flex flex-1 justify-between">
					<p class="font-bold">Name</p>

					<UserIcon />
				</div>

				<p class="flex-1 font-light wrap-break-word whitespace-pre-wrap">
					{me.name}
				</p>
			</div>
		</div>

		<div class="mb-4 flex flex-wrap gap-4">
			<div class="flex w-full flex-col gap-4 rounded-md border border-border p-4 shadow-md">
				<div class="flex flex-1 justify-between gap-3">
					<p class="font-bold">Email</p>

					<MailIcon />
				</div>

				<p
				class="flex flex-1 flex-wrap items-center gap-4 font-light wrap-break-word whitespace-pre-wrap"
				>
					{#if mode !== 'changeEmail'}

					{me.email}
					{:else}
					<form class="flex flex-col gap-2" {...changeEmailStart}>
						<div class="flex gap-2">
							<input class="flex-1" />
							<button></button>
						</div>
					</form>
					{/if}
				
				{#if mode === 'emailChanged'}
				<span
				class="bg-succes/5 rounded-lg border border-success/50 px-2 py-1.5 text-sm"
						>
							Recently Updated
						</span>
					{/if}

					{#if mode !== 'changeEmail'}
						<a href="/" class="button ms-auto p-1.5">
							<SquarePenIcon class="text-accent" size={18} />
						</a>
					{/if}
				</p>
			</div>
		</div>

		<div class="mb-4 flex flex-wrap gap-4">
			<div class="flex w-full flex-col gap-4 rounded-md border border-border p-4 shadow-md">
				<div class="flex flex-1 justify-between">
					<p class="font-bold">Created</p>

					<ClockIcon />
				</div>

				<p class="flex-1 font-light wrap-break-word whitespace-pre-wrap">
					{createdDate}
					<br />
					( {accountAge} )
				</p>
			</div>
		</div>

		<a class="button mt-auto bg-danger text-center dark:text-accent-fg" href="/logout">
			Logout
		</a>
	</div>
</div>
