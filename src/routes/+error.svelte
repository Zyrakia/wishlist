<script lang="ts">
	import { page } from '$app/state';

	console.log(page.status);
	console.warn(page.error);
</script>

<div class="container">
	<div class="letters">
		<div class="letters">
			<h2 class="block">O</h2>
			<h2 class="block">H</h2>
		</div>

		<br />

		<div class="letters">
			<h2 class="block">S</h2>
			<h2 class="block">N</h2>
			<h2 class="block">A</h2>
			<h2 class="block">P</h2>
		</div>
	</div>

	<h1 class="block error-status">
		{page.status}
	</h1>

	<hr />

	<a href="/" class="exit-button">Return to Safety</a>
</div>

<style>
	.container {
		width: 100%;
		height: 100%;

		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
	}

	.block {
		border: 1px solid black;
		border-radius: 8px;
		padding: 0.5em;

		animation: rotate-box-shadow 500ms ease infinite alternate;
		transition: transform 100ms ease-in-out;
	}

	.block:hover {
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
