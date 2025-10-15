<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children?.()}

<style>
	:global {
		*,
		*::before,
		*::after {
			box-sizing: border-box;
		}

		html,
		body {
			height: 100%;
		}

		body {
			margin: 0;

			font-family: 'Lato', sans-serif;
			font-weight: 400;
			font-style: normal;
		}

		img,
		svg {
			display: block;
			width: 100%;
			height: auto;
		}

		input,
		button,
		textarea,
		select {
			font: inherit;
			color: inherit;
		}

		h1,
		h2,
		h3,
		h4,
		h5,
		h6,
		p {
			margin: 0;
		}

		a {
			color: initial;
			text-decoration: none;
		}
	}
</style>
