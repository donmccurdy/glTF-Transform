<script lang="ts">
import { Class, Enum, Function, Interface } from '@greendoc/svelte';
import type { PageData } from './$types';
export let data: PageData;
</script>

<section class="greendoc-panel" style="padding-bottom: 0;">
	<h1>{data.export.name}</h1>
</section>

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
