import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { parser, encoder, getMetadata } from '$lib/server/model';
import type { GD } from '@greendoc/parse';

export const load: PageServerLoad<{ export: GD.ApiItem }> = async ({ params }) => {
	const slug = params.slug.replace(/\.html$/, '');
	const item = parser.getItemBySlug(slug);
	const encodedItem = encoder.encodeItem(item);
	if (item && encodedItem) {
		return {
			metadata: getMetadata(encodedItem),
			export: encodedItem,
		};
	}
	error(404, 'Not found');
};
