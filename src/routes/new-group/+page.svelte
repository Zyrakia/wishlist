<script lang="ts">
	import GroupEditor from '$lib/components/group-editor.svelte';
	import { createGroup } from '$lib/remotes/group.remote.js';
	import { GroupSchema } from '$lib/schemas/group.js';

	let { data } = $props();

	const remote = createGroup.preflight(GroupSchema);
</script>

{#if data.ownedGroup}
	<div class="flex h-full flex-col items-center justify-center gap-3">
		<p class="text-danger">
			You can currenly only own <span class="font-extrabold">one</span> group.
		</p>
		<a class="button bg-success text-accent-fg" href="/">Return Home</a>
	</div>
{:else}
	<GroupEditor handler={remote} />
{/if}
