import type { Accessor, Document, Primitive, Transform } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { createTransform } from './utils.js';

const NAME = 'dequantize';

/** Options for the {@link dequantize} function. */
export interface DequantizeOptions {
	/**
	 * Pattern (regex) used to filter vertex attribute semantics for quantization.
	 * Default: `/^((?!JOINTS_).)*$/`.
	 */
	pattern?: RegExp;
}

const DEQUANTIZE_DEFAULTS: DequantizeOptions = {
	pattern: /^((?!JOINTS_).)*$/,
};

/**
 * Dequantize {@link Primitive Primitives}, removing {@link KHRMeshQuantization `KHR_mesh_quantization`}
 * if present. Dequantization will increase the size of the mesh on disk and in memory, but may be
 * necessary for compatibility with applications that don't support quantization.
 *
 * Example:
 *
 * ```javascript
 * import { dequantizePrimitive } from '@gltf-transform/functions';
 *
 * await document.transform(dequantize());
 * ```
 *
 * @category Transforms
 */
export function dequantize(_options: DequantizeOptions = DEQUANTIZE_DEFAULTS): Transform {
	const options = { ...DEQUANTIZE_DEFAULTS, ..._options } as Required<DequantizeOptions>;

	return createTransform(NAME, (doc: Document): void => {
		const logger = doc.getLogger();
		for (const mesh of doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				dequantizePrimitive(prim, options);
			}
		}
		doc.createExtension(KHRMeshQuantization).dispose();
		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * Dequantize a single {@link Primitive}, converting all vertex attributes to float32. Dequantization
 * will increase the size of the mesh on disk and in memory, but may be necessary for compatibility
 * with applications that don't support quantization.
 *
 * Example:
 *
 * ```javascript
 * import { dequantizePrimitive } from '@gltf-transform/functions';
 *
 * const mesh = document.getRoot().listMeshes().find((mesh) => mesh.getName() === 'MyMesh');
 *
 * for (const prim of mesh.listPrimitives()) {
 * 	dequantizePrimitive(prim);
 * }
 * ```
 */
export function dequantizePrimitive(prim: Primitive, options: Required<DequantizeOptions>): void {
	for (const semantic of prim.listSemantics()) {
		dequantizeAttribute(semantic, prim.getAttribute(semantic)!, options);
	}
	for (const target of prim.listTargets()) {
		for (const semantic of target.listSemantics()) {
			dequantizeAttribute(semantic, target.getAttribute(semantic)!, options);
		}
	}
}

export function dequantizeAttribute(semantic: string, attribute: Accessor, options: Required<DequantizeOptions>): void {
	if (!attribute.getArray()) return;
	if (!options.pattern.test(semantic)) return;
	if (attribute.getComponentSize() >= 4) return;

	const srcArray = attribute.getArray()!;
	const dstArray = new Float32Array(srcArray.length);

	for (let i = 0, il = attribute.getCount(), el = [] as number[]; i < il; i++) {
		el = attribute.getElement(i, el);
		attribute.setArray(dstArray).setElement(i, el).setArray(srcArray);
	}

	attribute.setArray(dstArray).setNormalized(false);
}
