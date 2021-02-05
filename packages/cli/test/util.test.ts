import test from 'tape';
import { formatBytes, formatHeader, formatParagraph } from '../';

const HEADER = `
 HELLO
 ────────────────────────────────────────────`;

// eslint-disable-next-line max-len
const TEXT = 'Chupa chups biscuit ice cream wafer. Chocolate bar lollipop marshmallow powder. Sesame snaps sweet roll icing macaroon croissant jujubes pastry apple pie chocolate cake. Liquorice jelly-o pie jujubes fruitcake chocolate bar jelly-o tart. Marshmallow icing tart tootsie roll brownie dragée.';

const PARAGRAPH = `
Chupa chups biscuit ice cream wafer. Chocolate bar lollipop marshmallow powder.
Sesame snaps sweet roll icing macaroon croissant jujubes pastry apple pie
chocolate cake. Liquorice jelly-o pie jujubes fruitcake chocolate bar jelly-o
tart. Marshmallow icing tart tootsie roll brownie dragée.`.trim();

test('@gltf-transform/cli::util', t => {
	t.equals(formatBytes(1024), '1 KB', 'formatBytes');
	t.equals(formatHeader('Hello'), HEADER, 'formatHeader');
	t.equals(formatParagraph(TEXT), PARAGRAPH, 'formatParagraph');
	t.end();
});
