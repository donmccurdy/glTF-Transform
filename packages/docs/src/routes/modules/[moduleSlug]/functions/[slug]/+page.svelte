<script lang="ts">
	import type { PageData } from './$types';
	import { Function } from '@greendoc/svelte';
	export let data: PageData;
</script>

<Function data={data.export} />
