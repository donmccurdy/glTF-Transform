import { NodeIO } from './node-io.js';

/**
 * *I/O service for [Deno](https://deno.land/).*
 *
 * The most common use of the I/O service is to read/write a {@link Document} with a given path.
 * Methods are also available for converting in-memory representations of raw glTF files, both
 * binary (*Uint8Array*) and JSON ({@link JSONDocument}).
 *
 * _*NOTICE:* Support for the Deno environment is currently experimental. See
 * [glTF-Transform#457](https://github.com/donmccurdy/glTF-Transform/issues/457)._
 *
 * Usage:
 *
 * ```typescript
 * import { DenoIO } from 'https://esm.sh/@gltf-transform/core';
 *
 * const io = new DenoIO();
 *
 * // Read.
 * let document;
 * document = io.read('model.glb');  // → Document
 * document = io.readBinary(glb);    // Uint8Array → Document
 *
 * // Write.
 * const glb = io.writeBinary(document);  // Document → Uint8Array
 * ```
 *
 * @category I/O
 */
export class DenoIO extends NodeIO {}
