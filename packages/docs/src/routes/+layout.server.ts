import type { LayoutServerLoad } from './$types';
import { parser } from '$lib/server/model';
import type { Node } from 'ts-morph';

export const prerender = true;

const coreExports = parser
	.getModuleExports('@gltf-transform/core')
	.map(createExport)
	.sort((a: Export, b: Export) => (a.text > b.text ? 1 : -1));
const extensionsExports = parser
	.getModuleExports('@gltf-transform/extensions')
	.map(createExport)
	.sort((a: Export, b: Export) => (a.text > b.text ? 1 : -1));
const functionsExports = parser
	.getModuleExports('@gltf-transform/functions')
	.map(createExport)
	.sort((a: Export, b: Export) => (a.text > b.text ? 1 : -1));

interface Export {
	text: string;
	href: string;
	kind: string;
	category?: string;
	external?: boolean;
}

function createExport(item: Node): Export {
	return {
		text: parser.getName(item),
		href: parser.getPath(item),
		kind: item.getKindName(),
		category: parser.getTag(item, 'category') || undefined,
	};
}

export const load: LayoutServerLoad = () => {
	return {
		metadata: {
			title: 'glTF Transform',
			snippet: '',
		},
		navigation: {
			sections: [
				{
					title: 'Introduction',
					items: [
						{ text: 'Home ', href: '/' },
						{ text: 'Concepts', href: '/concepts' },
						{ text: 'Extensions', href: '/extensions' },
						{ text: 'Functions', href: '/functions' },
					],
					subsections: [],
				},
				{
					title: 'Resources',
					items: [
						{ text: 'Contributing ', href: '/contributing' },
						{ text: 'Credits ', href: '/credits' },
						{
							text: 'GitHub',
							external: true,
							href: 'https://github.com/donmccurdy/glTF-Transform',
						},
						{
							text: 'NPM',
							external: true,
							href: 'https://www.npmjs.com/search?q=%40gltf-transform',
						},
						{
							text: 'Discussions',
							external: true,
							href: 'https://github.com/donmccurdy/glTF-Transform/discussions',
						},
						{
							text: 'Changelog',
							external: true,
							href: 'https://github.com/donmccurdy/glTF-Transform/blob/main/CHANGELOG.md',
						},
					],
					subsections: [],
				},
				{
					title: '@gltf-transform/cli',
					items: [],
					subsections: [
						{
							title: 'Command-line',
							items: [
								{ text: 'Quickstart', href: '/cli' },
								{ text: 'Configuration ', href: '/cli-configuration' },
							],
						},
					],
				},
				{
					title: '@gltf-transform/core',
					items: [],
					subsections: [
						{
							title: 'Documents',
							items: coreExports.filter(({ category }) => category === 'Documents'),
						},
						{
							title: 'I/O',
							items: coreExports.filter(({ category }) => category === 'I/O'),
						},
						{
							title: 'Properties',
							items: coreExports.filter(({ category }) => category === 'Properties'),
						},
						{
							title: 'Utilities',
							items: coreExports.filter(({ category }) => category === 'Utilities'),
						},
					],
				},
				{
					title: '@gltf-transform/extensions',
					items: [],
					subsections: [
						{
							title: 'Khronos Extensions',
							items: extensionsExports.filter(
								({ text, kind }) => text.startsWith('KHR') && kind === 'ClassDeclaration',
							),
						},
						{
							title: 'Vendor Extensions',
							items: extensionsExports.filter(
								({ text, kind }) => text.startsWith('EXT') && kind === 'ClassDeclaration',
							),
						},
					],
				},
				{
					title: '@gltf-transform/functions',
					items: [],
					subsections: [
						{
							title: 'Transforms',
							items: functionsExports.filter(({ category }) => category === 'Transforms'),
						},
						{
							title: 'Functions',
							items: functionsExports.filter(
								({ category, kind }) => category !== 'Transforms' && kind === 'FunctionDeclaration',
							),
						},
					],
				},
			],
		},
	};
};
