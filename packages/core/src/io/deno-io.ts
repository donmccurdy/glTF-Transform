import { NodeIO } from './node-io';

/**
 * # DenoIO
 *
 * *I/O service for Deno.*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*ArrayBuffer*) and JSON ({@link JSONDocument}).
 *
 * Usage:
 *
 * ```typescript
 * import { DenoIO } from 'https://esm.sh/@gltf-transform/core';
 *
 * const io = new DenoIO();
 *
 * // Read.
 * io.read('model.glb');             // → Document
 * io.readBinary(ArrayBuffer);       // → Document
 *
 * // Write.
 * io.write('model.glb', doc); // → void
 * io.writeBinary(doc);        // → ArrayBuffer
 * ```
 *
 * @category I/O
 */
export class DenoIO extends NodeIO {}
