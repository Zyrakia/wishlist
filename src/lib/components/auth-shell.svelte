<script lang="ts">
	import backgroundImage from '$lib/assets/authentication-background.webp';

	import type { Snippet } from 'svelte';

	let { title, alternate, children }: { title: string; alternate: Snippet; children: Snippet } =
		$props();
</script>

<div
	style="background-image: url({backgroundImage});"
	class="relative flex min-h-full w-full justify-center bg-cover bg-bottom-right bg-no-repeat p-6 py-12 font-rounded md:items-center md:justify-start md:p-12"
>
	<div class="absolute inset-0 dark:bg-[#1a1310]/70"></div>

	<div
		class="z-10 flex h-max w-full max-w-lg flex-col rounded-2xl bg-surface/95 p-8 shadow-xl shadow-black/10 md:p-10"
	>
		<a href="/welcome" class="mb-8 w-max font-display text-xl text-brand">Wishii</a>

		<h1 class="text-4xl md:text-5xl">{title}</h1>
		<p class="mt-2 mb-8 text-text-muted">{@render alternate()}</p>

		{@render children()}
	</div>
</div>
