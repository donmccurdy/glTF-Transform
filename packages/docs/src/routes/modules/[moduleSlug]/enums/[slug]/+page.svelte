<script lang="ts">
	import type { PageData } from './$types';
	import { Enum } from '@greendoc/svelte';
	export let data: PageData;
</script>

<Enum data={data.export} />
