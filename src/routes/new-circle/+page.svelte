<script lang="ts">
	import CircleEditor from '$lib/components/circle-editor.svelte';
	import { createCircle } from '$lib/remotes/circle.remote';
	import { CircleSchema } from '$lib/schemas/circle';

	let { data } = $props();

	const remote = createCircle.preflight(CircleSchema);
</script>

{#if data.ownedCircle}
	<div class="flex h-full flex-col items-center justify-center gap-3">
		<p class="text-danger">
			You can currenly only own <span class="font-extrabold">one</span> circle.
		</p>
		<a class="button bg-success text-accent-fg" href="/">Return Home</a>
	</div>
{:else}
	<CircleEditor handler={remote} />
{/if}
