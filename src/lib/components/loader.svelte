<script lang="ts">
	let {
		color = 'var(--color-accent)',
		thickness = '5px',
		pulseCount = 3,
		pulseStaggerDur = '500ms',
		pulseDur = '2s',
		alternate = false,
	}: {
		messages?: string[];
		color?: string;
		thickness?: string;
		pulseCount?: number;
		pulseStaggerDur?: string;
		pulseDur?: string;
		alternate?: boolean;
	} = $props();
</script>

<div class="relative grid h-full w-full place-items-center">
	{#each { length: pulseCount }, i}
		<div
			style="border-color: {color}; border-width: {thickness}; animation-direction: {alternate
				? 'alternate'
				: 'forward'}; animation-duration: {pulseDur}; animation-delay: calc({i} * {pulseStaggerDur})"
			class="pulse"
		></div>
	{/each}
</div>

<style>
	.pulse {
		z-index: 1;
		position: absolute;

		height: 0;
		opacity: 0;

		aspect-ratio: 1;

		border-radius: 100%;
		border-style: solid;

		animation-name: pulse-up;
		animation-iteration-count: infinite;
		animation-timing-function: ease-in-out;
	}

	@keyframes pulse-up {
		0% {
			opacity: 0;
			height: 0;
		}

		50% {
			opacity: 1;
		}

		100% {
			height: 100%;
			opacity: 0;
		}
	}
</style>
