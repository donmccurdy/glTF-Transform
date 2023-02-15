const path = require('path');

/**
 * Constants used in round trip scripts.
 */

/** Source directory, referencing glTF-Sample-Models. */

const SOURCE = path.resolve(__dirname, '../../glTF-Sample-Models/2.0/');

/** Output directory for generated roundtrip assets. */
const TARGET = path.resolve(__dirname, './out');

const VARIANT = 'glTF-Binary';

/**
 * Assets to skip.
 *
 * Rationale:
 * - AnimatedTriangle: Roundtrip writes GLB; this model relies on two buffers.
 * - SimpleMorph: ""
 * - SpecGlossVsMetalRough: ""
 */
const SKIPLIST = new Set(['AnimatedTriangle', 'SimpleMorph', 'SpecGlossVsMetalRough']);

module.exports = { SOURCE, TARGET, VARIANT, SKIPLIST };
