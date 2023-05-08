<script lang="ts">
	import type { PageData } from './$types';
	import { Class } from '@greendoc/svelte';
	export let data: PageData;
</script>

<Class data={data.export} />
