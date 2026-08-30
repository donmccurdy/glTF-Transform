import { deepEqual, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { formatBytes, formatHeader, formatParagraph, pLimit } from '@gltf-transform/cli';

const HEADER = `
 HELLO
 ────────────────────────────────────────────`;

const TEXT =
	'Chupa chups biscuit ice cream wafer. Chocolate bar lollipop marshmallow powder. Sesame snaps sweet roll icing macaroon croissant jujubes pastry apple pie chocolate cake. Liquorice jelly-o pie jujubes fruitcake chocolate bar jelly-o tart. Marshmallow icing tart tootsie roll brownie dragée.';

const PARAGRAPH = `
Chupa chups biscuit ice cream wafer. Chocolate bar lollipop marshmallow powder.
Sesame snaps sweet roll icing macaroon croissant jujubes pastry apple pie
chocolate cake. Liquorice jelly-o pie jujubes fruitcake chocolate bar jelly-o
tart. Marshmallow icing tart tootsie roll brownie dragée.`.trim();

describe('cli::util', () => {
	test('formatBytes', () => {
		strictEqual(formatBytes(1000), '1 KB', 'formatBytes');
	});

	test('formatHeader', () => {
		strictEqual(formatHeader('Hello'), HEADER, 'formatHeader');
	});

	test('formatParagraph', () => {
		strictEqual(formatParagraph(TEXT), PARAGRAPH, 'formatParagraph');
	});

	test('pLimit', async () => {
		const expected = ['a', 'b', 'c', 'd', 'e'];

		for (const limit of [1, 2, 3, 4, 5]) {
			const actual = [];
			await pLimit(expected, limit, (item, index) => (actual[index] = item));
			deepEqual(actual, expected, `limit=${limit}`);
		}
	});
});
