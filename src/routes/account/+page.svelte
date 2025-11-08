<script lang="ts">
	import { ClockIcon, type IconProps, MailIcon, UserIcon } from '@lucide/svelte';
	import type { Component } from 'svelte';

	type IconComponent = Component<IconProps, {}, ''>;
	let { data } = $props();

	const me = $derived(data.me);

	const dtf = new Intl.DateTimeFormat(navigator.languages, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});

	const rdtf = new Intl.RelativeTimeFormat(navigator.language, { style: 'long' });

	const createdDate = $derived(dtf.format(me.createdAt));

	const accountAgeSeconds = $derived((new Date().getTime() - me.createdAt.getTime()) / 1000);
	const accountAge = $derived.by(() => {
		const ageS = accountAgeSeconds;
		const ageM = ageS / 60;
		const ageH = ageM / 60;
		const ageD = ageH / 24;

		const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
			ageD > 1
				? [ageD, 'days']
				: ageH > 1
					? [ageH, 'hours']
					: ageM > 1
						? [ageM, 'minutes']
						: [ageS, 'seconds'];

		return rdtf.format(-Math.floor(value), unit);
	});

	const info = $derived.by(
		(): { title: string; key: keyof typeof me; content: string; icon: IconComponent }[] => {
			return [
				{ title: 'Name', key: 'name', content: me.name, icon: UserIcon },
				{ title: 'Email', key: 'email', content: me.email, icon: MailIcon },
				{
					title: 'Created',
					key: 'createdAt',
					content: `${createdDate}\n( ${accountAge} )`,
					icon: ClockIcon,
				},
			];
		},
	);
</script>

<div class="grid h-full w-full place-items-center bg-background">
	<div class="float-container my-0 flex min-h-6/8 flex-col bg-surface p-8">
		<h1 class="text-2xl font-bold">Your Account</h1>

		<hr class="mt-1 mb-4" />

		<div class="mb-4 flex flex-wrap gap-4">
			{#each info as infoCard}
				{@const Icon = infoCard.icon}

				<div
					class="flex w-full flex-col gap-4 rounded-md border border-border p-4 shadow-md"
				>
					<div class="flex flex-1 justify-between">
						<p class="font-bold">{infoCard.title}</p>

						<Icon />
					</div>

					<p class="flex-1 font-light wrap-break-word whitespace-pre-wrap">
						{infoCard.content}
					</p>
				</div>
			{/each}
		</div>

		<a class="button mt-auto bg-danger text-center dark:text-accent-fg" href="/logout">Logout</a
		>
	</div>
</div>
