import type { GD } from '@greendoc/parse';
import { error } from '@sveltejs/kit';
import { encoder, getMetadata, parser } from '$lib/server/model';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad<{ export: GD.ApiItem }> = async ({ params }) => {
	const slug = params.slug.replace(/\.html$/, '');
	const item = parser.getItemBySlug(slug);
	const encodedItem = encoder.encodeItem(item);
	if (item && encodedItem) {
		// Hide inherited event methods in Property documentation.
		if (
			encodedItem.kind === 'Class' &&
			'properties' in encodedItem &&
			Array.isArray(encodedItem.properties) &&
			'methods' in encodedItem &&
			Array.isArray(encodedItem.methods) &&
			encodedItem.properties.some((property) => property.name === 'propertyType')
		) {
			const hiddenMethods = new Set(['addEventListener', 'removeEventListener', 'dispatchEvent']);

			for (let i = encodedItem.methods.length - 1; i >= 0; i--) {
				if (hiddenMethods.has(encodedItem.methods[i].name)) {
					encodedItem.methods.splice(i, 1);
				}
			}
		}

		return {
			metadata: getMetadata(encodedItem),
			export: encodedItem,
		};
	}
	error(404, 'Not found');
};
