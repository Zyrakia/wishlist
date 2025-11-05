<script lang="ts">
	import '$lib/assets/app.css';
	import favicon from '$lib/assets/favicon.svg';

	import { SquareUserIcon, LogInIcon } from '@lucide/svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
		rel="stylesheet"
	/>

	<title>Wishii</title>
</svelte:head>

<div class="h-full flex flex-col">
	<header class="shrink-0 min-h-16 drop-shadow-md p-4 flex items-center gap-2 border-b">
		<div class="w-full flex gap-6 items-center justify-between flex-wrap">
			<a href="/" class="font-semibold">Wishii</a>

			<nav class="flex gap-6">
				{#if data.user}
					<a class="truncate" href="/account">
						<SquareUserIcon />

						{data.user.name}
					</a>
				{:else}
					<a href="login">
						Login

						<LogInIcon />
					</a>
				{/if}
			</nav>
		</div>
	</header>

	<main class="w-full h-full">
		{@render children()}
	</main>
</div>

<style>
	@reference "tailwindcss";

	a {
		@apply flex gap-2 items-center transition-colors;
	}

	a:hover {
		@apply text-blue-700;
	}
</style>
