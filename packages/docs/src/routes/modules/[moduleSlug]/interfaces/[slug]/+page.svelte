<script lang="ts">
	import type { PageData } from './$types';
	import { Interface } from '@greendoc/svelte';
	export let data: PageData;
</script>

<Interface data={data.export} />
