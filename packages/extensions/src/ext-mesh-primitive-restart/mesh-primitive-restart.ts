import { Extension, type ReaderContext, type WriterContext } from '@gltf-transform/core';
import { EXT_MESH_PRIMITIVE_RESTART } from '../constants.js';

/**
 * [`EXT_mesh_primitive_restart`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Vendor/EXT_mesh_primitive_restart/)
 * enables batching multiple line strips, line loops, triangle strips, or triangle fans into a single draw call.
 *
 * By default, glTF 2.0 prohibits index buffers from containing maximal index values. These values
 * are used in many graphics APIs, including WebGL 2, as primitive restart values. The
 * `EXT_mesh_primitive_restart` extension lifts that restriction, allowing restart values to be used
 * in the indices of any {@link Primitive} with an applicable draw mode. When present in indices,
 * the primitive restart value instructs the graphics API to end the current topological primitive,
 * and to begin a new topological primitive on the next index. Compared to writing separate
 * Primitives and separate indices {@link Accessor Accessors}, use of primitive restart values
 * can improve runtime performance and file size in assets with many primitives. Implementations
 * using graphics APIs that do not support primitive restart values may still support this extension,
 * by pre-processing the indices, potentially still receiving some performance benefits.
 *
 * The following {@link PrimitiveMode PrimitiveModes} support primitive restart values:
 *
 * - `LINE_LOOP`
 * - `LINE_STRIP`
 * - `TRIANGLE_STRIP`
 * - `TRIANGLE_FAN`
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing any {@link Primitive} with an
 * applicable {@link PrimitiveMode} to use primitive restart values in its indices. Without the
 * Extension, the same use of these data types would yield an invalid glTF document, under the
 * stricter core glTF specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { EXTMeshPrimitiveRestart } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const primRestartExtension = document.createExtension(EXTMeshPrimitiveRestart).setRequired(true);
 *
 * // Create a LINE_STRIP primitive containing two line strips. The first connects vertices
 * // [0, 1, 2], and the second connects vertices [3, 4, 5].
 * const indices = document.createAccessor()
 *   .setType("SCALAR")
 *   .setArray(new Uint16Array([0, 1, 2, 0xFFFF, 3, 4, 5]));
 * const position = document.createAccessor()
 *   .setType("VEC3")
 *   .setArray(new Float32Array([...]))
 * const prim = document.createPrimitive()
 *   .setMode(Primitive.Mode.LINE_STRIP)
 *   .setAttribute('POSITION', position)
 * 	 .setIndices(indices);
 * ```
 */
export class EXTMeshPrimitiveRestart extends Extension {
	public readonly extensionName: typeof EXT_MESH_PRIMITIVE_RESTART = EXT_MESH_PRIMITIVE_RESTART;
	public static readonly EXTENSION_NAME: typeof EXT_MESH_PRIMITIVE_RESTART = EXT_MESH_PRIMITIVE_RESTART;

	/** @hidden */
	read(_: ReaderContext): this {
		return this;
	}

	/** @hidden */
	write(_: WriterContext): this {
		return this;
	}
}
