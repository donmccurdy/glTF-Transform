const path = require('path');

/** Constants used in round trip scripts. */

const SOURCE = path.resolve(__dirname, '../../glTF-Sample-Models/2.0/');
const TARGET = path.resolve(__dirname, './out');
const VARIANTS = new Set(['glTF']);
const INDEX = require(path.join(SOURCE, 'model-index.json'));

module.exports = {SOURCE, TARGET, VARIANTS, INDEX};
