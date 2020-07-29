const test = require('tape');
const util = require('../src/util');

const HEADER = `
 HELLO
 ────────────────────────────────────────────`;

const TEXT = `Chupa chups biscuit ice cream wafer. Chocolate bar lollipop marshmallow powder. Sesame snaps sweet roll icing macaroon croissant jujubes pastry apple pie chocolate cake. Liquorice jelly-o pie jujubes fruitcake chocolate bar jelly-o tart. Marshmallow icing tart tootsie roll brownie dragée.`;

const PARAGRAPH = `
Chupa chups biscuit ice cream wafer. Chocolate bar lollipop marshmallow powder.
Sesame snaps sweet roll icing macaroon croissant jujubes pastry apple pie
chocolate cake. Liquorice jelly-o pie jujubes fruitcake chocolate bar jelly-o
tart. Marshmallow icing tart tootsie roll brownie dragée.`.trim();

test('@gltf-transform/cli::util', t => {
	t.equals(util.formatBytes(1024), '1 KB', 'formatBytes');
	t.equals(util.formatHeader('Hello'), HEADER, 'formatHeader');
	t.equals(util.formatParagraph(TEXT), PARAGRAPH, 'formatParagraph');
	t.end();
});
