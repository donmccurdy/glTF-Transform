import test from 'ava';
import { formatBytes, formatHeader, formatParagraph } from '@gltf-transform/cli';

const HEADER = `
 HELLO
 ────────────────────────────────────────────`;

const TEXT = // eslint-disable-next-line max-len
	'Chupa chups biscuit ice cream wafer. Chocolate bar lollipop marshmallow powder. Sesame snaps sweet roll icing macaroon croissant jujubes pastry apple pie chocolate cake. Liquorice jelly-o pie jujubes fruitcake chocolate bar jelly-o tart. Marshmallow icing tart tootsie roll brownie dragée.';

const PARAGRAPH = `
Chupa chups biscuit ice cream wafer. Chocolate bar lollipop marshmallow powder.
Sesame snaps sweet roll icing macaroon croissant jujubes pastry apple pie
chocolate cake. Liquorice jelly-o pie jujubes fruitcake chocolate bar jelly-o
tart. Marshmallow icing tart tootsie roll brownie dragée.`.trim();

test('formatBytes', (t) => {
	t.is(formatBytes(1000), '1 KB', 'formatBytes');
});

test('formatHeader', (t) => {
	t.is(formatHeader('Hello'), HEADER, 'formatHeader');
});

test('formatParagraph', (t) => {
	t.is(formatParagraph(TEXT), PARAGRAPH, 'formatParagraph');
});
