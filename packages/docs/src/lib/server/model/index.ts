import { Encoder, GD, Parser, createPrefixSort } from '@greendoc/parse';
import { Project } from 'ts-morph';
import he from 'he';

const BASE = new URL('../../../../../../', import.meta.url).pathname.replace(/\/$/, '');

const corePath = `${BASE}/packages/core/src/index.ts`;
const extensionsPath = `${BASE}/packages/extensions/src/index.ts`;
const functionsPath = `${BASE}/packages/functions/src/index.ts`;

const project = new Project({
	compilerOptions: {
		paths: {
			'@gltf-transform/core': [corePath],
			'@gltf-transform/extensions': [extensionsPath],
			'@gltf-transform/functions': [functionsPath],
		},
	},
});

export const parser = new Parser(project)
	.addModule({ name: '@gltf-transform/core', slug: 'core', entry: corePath })
	.addModule({ name: '@gltf-transform/extensions', slug: 'extensions', entry: extensionsPath })
	.addModule({ name: '@gltf-transform/functions', slug: 'functions', entry: functionsPath })
	.setRootPath(BASE)
	.setBaseURL('https://github.com/donmccurdy/glTF-Transform/tree/main')
	.init();

export const encoder = new Encoder(parser).setSort(createPrefixSort());

export function getMetadata(item: GD.ApiItem): {
	title: string;
	snippet: string;
} {
	return {
		title: item.name + ' | glTF Transform',
		snippet: item.comment ? getSnippet(item.comment) : '',
	};
}

export function getSnippet(html: string): string {
	const text = he.decode(html.replace(/(<([^>]+)>)/gi, ''));
	const words = text.split(/\s+/);
	if (words.length < 30) return text;
	return words.slice(0, 30).join(' ') + '…';
}
