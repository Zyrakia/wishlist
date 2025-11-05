<script lang="ts">
	import { MoonIcon, SunMoonIcon, SunIcon } from '@lucide/svelte';

	let { name }: { name: string } = $props();

	const hourOfDay = new Date().getHours();
	const periodOfDay =
		hourOfDay < 6
			? 'early morning'
			: hourOfDay < 12
				? 'morning'
				: hourOfDay < 18
					? 'afternoon'
					: 'evening';
</script>

<div class="w-full flex gap-3 items-center">
	<p>
		{#if periodOfDay === 'early morning'}
			<MoonIcon class="text-purple-600" size={32} />
		{:else if periodOfDay === 'morning'}
			<SunMoonIcon class="text-amber-500" size={32} />
		{:else if periodOfDay === 'afternoon'}
			<SunIcon class="text-orange-500" size={32} />
		{:else if periodOfDay === 'evening'}
			<SunMoonIcon class="text-violet-600" size={32} />
		{/if}
	</p>

	<h1 class="text-3xl">
		Good {periodOfDay},
		<span class="font-semibold">{name}</span>
	</h1>
</div>
