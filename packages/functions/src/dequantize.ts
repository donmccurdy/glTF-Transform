import {
	MathUtils,
	type Accessor,
	type Document,
	type GLTF,
	type Primitive,
	type Transform,
	TypedArray,
} from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { assignDefaults, createTransform } from './utils.js';

const NAME = 'dequantize';

/** Options for the {@link dequantize} function. */
export interface DequantizeOptions {
	/**
	 * Pattern (regex) used to filter vertex attribute semantics for quantization.
	 * Default: `/^((?!JOINTS_).)*$/`.
	 */
	pattern?: RegExp;
}

const DEQUANTIZE_DEFAULTS: Required<DequantizeOptions> = {
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
	const options = assignDefaults(DEQUANTIZE_DEFAULTS, _options);

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
export function dequantizePrimitive(prim: Primitive, _options = DEQUANTIZE_DEFAULTS): void {
	const options = assignDefaults(DEQUANTIZE_DEFAULTS, _options);

	for (const semantic of prim.listSemantics()) {
		if (options.pattern.test(semantic)) {
			dequantizeAttribute(prim.getAttribute(semantic)!);
		}
	}

	for (const target of prim.listTargets()) {
		for (const semantic of target.listSemantics()) {
			if (options.pattern.test(semantic)) {
				dequantizeAttribute(target.getAttribute(semantic)!);
			}
		}
	}
}

export function dequantizeAttribute(attribute: Accessor): void {
	const srcArray = attribute.getArray();
	if (!srcArray) return;

	const dstArray = dequantizeAttributeArray(srcArray, attribute.getComponentType(), attribute.getNormalized());

	attribute.setArray(dstArray).setNormalized(false);
}

export function dequantizeAttributeArray(
	srcArray: TypedArray,
	componentType: GLTF.AccessorComponentType,
	normalized: boolean,
): Float32Array {
	const dstArray = new Float32Array(srcArray.length);

	for (let i = 0, il = srcArray.length; i < il; i++) {
		if (normalized) {
			dstArray[i] = MathUtils.decodeNormalizedInt(srcArray[i], componentType);
		} else {
			dstArray[i] = srcArray[i];
		}
	}

	return dstArray;
}
