<script lang="ts">
	import type { PageData } from './$types';
	import { Class, Interface, Enum, Function } from '@greendoc/svelte';
	export let data: PageData;
</script>

{#if data.export.kind === 'Class'}
	<Class data={data.export} />
{:else if data.export.kind === 'Interface'}
	<Interface data={data.export} />
{:else if data.export.kind === 'Enum'}
	<Enum data={data.export} />
{:else if data.export.kind === 'Function'}
	<Function data={data.export} />
{:else}
	<p>Error: Unknown kind, "${data.export.kind}"</p>
{/if}
