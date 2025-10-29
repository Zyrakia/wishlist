<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	onMount(() => console.error(page.error));
</script>

<div class="w-full h-full p-4 flex flex-col items-center justify-center gap-6">
	<div class="letters">
		<div class="letters">
			<h2 class="letters-box">O</h2>
			<h2 class="letters-box">H</h2>
		</div>

		<br />

		<div class="letters">
			<h2 class="letters-box">S</h2>
			<h2 class="letters-box">N</h2>
			<h2 class="letters-box">A</h2>
			<h2 class="letters-box">P</h2>
		</div>
	</div>

	<h1 class="letters-box error-status">
		{page.status}
	</h1>

	<hr class="divide" />

	<a href="/" class="exit-button">Return to Safety</a>
</div>

<style>
	.letters-box {
		border: 1px solid black;
		border-radius: 8px;
		padding: 0.5em;

		font-size: x-large;
		cursor: not-allowed;

		animation: rotate-box-shadow 500ms ease infinite alternate;
		transition: transform 100ms ease-out;
	}

	.letters-box:hover {
		transform: scale(1.3) translateY(-10%);
	}

	.letters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.error-status {
		font-family: monospace;
	}

	hr {
		max-width: 700px;
		width: 50%;
	}

	@media (max-width: 450px) {
		hr {
			width: 100%;
		}
	}

	.exit-button {
		padding: 8px;

		border: 1px solid black;
		border-radius: 5px;

		transition:
			transform 100ms ease,
			border-color 100ms ease;
	}

	.exit-button:hover {
		transform: scale(1.05);
	}

	.exit-button:active {
		transform: scale(0.975);
	}

	@keyframes rotate-box-shadow {
		0% {
			box-shadow:
				5px 5px 3px lightcoral,
				0 0 5px gray inset;
		}

		100% {
			box-shadow:
				-3px -3px 3px lightgreen,
				0 0 5px gray inset;
		}
	}
</style>
