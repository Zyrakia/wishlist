<script lang="ts">
	import CircleEditor from '$lib/components/circle-editor.svelte';
	import { updateCircle } from '$lib/remotes/circle.remote.js';
	import { CircleSchema } from '$lib/schemas/circle.js';

	let { data } = $props();
</script>

<CircleEditor handler={updateCircle.preflight(CircleSchema.partial())} init={data.circle} />
