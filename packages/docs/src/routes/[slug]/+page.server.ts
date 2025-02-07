import { render } from 'svelte/server';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	try {
		const { default: Page } = await import(`../../lib/pages/${params.slug}.md`);
		return render(Page);
	} catch (e) {
		error(404, 'Not found');
	}
};
