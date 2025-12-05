<script lang="ts">
	import GroupEditor from '$lib/components/group-editor.svelte';
	import { updateGroup } from '$lib/remotes/group.remote.js';
	import { GroupSchema } from '$lib/schemas/group.js';

	let { data } = $props();
</script>

<GroupEditor handler={updateGroup.preflight(GroupSchema.partial())} init={data.group} />
