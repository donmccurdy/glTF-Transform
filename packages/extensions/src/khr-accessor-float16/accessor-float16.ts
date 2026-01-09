import { Extension, type ReaderContext, type WriterContext } from '@gltf-transform/core';
import { KHR_ACCESSOR_FLOAT16 } from '../constants.js';

const NAME = KHR_ACCESSOR_FLOAT16;

/**
 * [`KHR_accessor_float16`](https://github.com/donmccurdy/glTF-Transform/pull/1417) enables support
 * for IEEE-754 binary16 ("half-precision" or "float16") {@link Accessor Accessors}, in all
 * contexts where the base glTF 2.0 specification already allows binary32 ("single-precision" or
 * "float32") Accessors. This extension must be marked as required; implementations that do not
 * support float16 Accessors will be unable to parse the Document correctly.
 *
 * ### Example
 *
 * ```typescript
 * import {Accessor} from '@gltf-transform/core';
 * import {KHRAccessorFloat16} from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * document.createExtension(KHRAccessorFloat16).setRequired(true);
 *
 * // Store Float16Array instances in one or more Accessors.
 * const mesh = document.getRoot().listMeshes()
 *   .find((mesh) => mesh.getName() === 'MyMesh');
 *
 * for (const prim of mesh.listPrimitives()) {
 *   const position = document.createAccessor()
 *     .setType('VEC3')
 *     .setArray(new Float16Array([...]));
 *   prim.setAttribute('POSITION', position);
 * }
 * ```
 *
 * @experimental KHR_accessor_float16 is not yet ratified by the Khronos Group.
 */
export class KHRAccessorFloat16 extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** @hidden */
	read(_: ReaderContext): this {
		return this;
	}

	/** @hidden */
	write(_: WriterContext): this {
		return this;
	}
}
