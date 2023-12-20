import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	let html = '';
	let metadata;

	try {
		const page = await import(`../../lib/pages/${params.slug}.md`);
		html = page.default.render().html;
		metadata = page.metadata;
	} catch (e) {
		//
	}

	if (!html) error(404, 'Not found');

	return { html, metadata };
};
