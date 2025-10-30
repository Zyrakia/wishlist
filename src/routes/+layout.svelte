<script lang="ts">
	import '$lib/assets/app.css';
	import favicon from '$lib/assets/favicon.svg';

	import { SquareUserIcon, LogInIcon, GiftIcon } from '@lucide/svelte';

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

<div class="min-h-dvh flex flex-col">
	<header class="shrink-0 min-h-16 drop-shadow-xs">
		<div class="w-full flex gap-6 items-center justify-between flex-wrap">
			<a href="/" class="font-semibold">Wishii</a>

			<nav class="flex gap-6">
				{#if data.user}
					<a class="truncate" href="/lists">
						<GiftIcon />

						My Lists
					</a>

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

	<main class="flex-1 flex overflow-y-auto">
		{@render children()}
	</main>
</div>

<style>
	header {
		padding: 1rem;

		display: flex;
		align-items: center;
		gap: 0.5rem;

		border-bottom: 1px solid rgba(0, 0, 0, 0.5);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}

	a {
		display: flex;
		gap: 0.5rem;
		align-items: center;

		transition: color 100ms ease;
	}

	a:hover {
		color: blue;
	}

	:global {
		body {
			font-family: 'Roboto', sans-serif;
			font-weight: 400;
			font-style: normal;
		}
	}

	:global {
		button,
		.button {
			position: relative;

			border: 1px solid black;
			border-radius: 5px;

			outline: none;
			cursor: pointer;

			transition: filter 150ms ease;
		}

		button:active,
		.button:active,
		button:hover,
		.button:hover {
			filter: brightness(0.93);
		}

		button:focus {
			border-width: 2px;
		}

		.button::before {
			content: '';

			position: absolute;
			left: -2px;
			top: -2px;
			width: calc(100% + 4px);
			height: calc(100% + 4px);

			border-radius: 5px;
		}

		button:hover::before,
		.button:hover::before {
			border: 2px solid rgba(0, 0, 0, 0.2);
		}

		button:focus::before,
		.button:focus::before {
			border: 2px solid rgba(0, 0, 0, 1);
		}

		button:disabled,
		.button:disabled {
			filter: brightness(0.7);
			cursor: initial;
		}
	}
</style>
