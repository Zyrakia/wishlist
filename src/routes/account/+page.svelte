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

<div class="w-full h-full bg-neutral-200 grid place-items-center">
	<div class="float-container my-0 h-full max-h-6/8 p-8 bg-white flex flex-col">
		<h1 class="font-bold text-2xl">Your Account</h1>

		<hr class="mt-1 mb-4" />

		<div class="flex flex-wrap gap-4">
			{#each info as infoCard}
				{@const Icon = infoCard.icon}

				<div
					class="w-full p-4 shadow-md rounded-md border border-neutral-500/50 flex flex-col gap-4"
				>
					<div class="flex-1 flex justify-between">
						<p class="font-bold">{infoCard.title}</p>

						<Icon />
					</div>

					<p class="flex-1 font-light whitespace-pre-wrap wrap-break-word">
						{infoCard.content}
					</p>
				</div>
			{/each}
		</div>

		<a class="button bg-red-200 mt-auto text-center" href="/logout">Logout</a>
	</div>
</div>
