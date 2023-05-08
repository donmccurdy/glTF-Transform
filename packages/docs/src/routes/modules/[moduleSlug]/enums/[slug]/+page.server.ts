import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { parser, encoder, getMetadata } from '$lib/server/model';
import type { GD } from '@greendoc/parse';
import type { EnumDeclaration } from 'ts-morph';

export const load: PageServerLoad<{ export: GD.ApiEnum }> = async ({ params }) => {
	const slug = params.slug.replace(/\.html$/, '');
	const item = parser.getItemBySlug(slug) as EnumDeclaration;
	const encodedItem = encoder.encodeItem(parser, item);
	if (item && encodedItem) {
		return {
			metadata: getMetadata(encodedItem),
			export: encodedItem
		};
	}
	throw error(404, 'Not found');
};
