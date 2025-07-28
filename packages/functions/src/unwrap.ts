import {
	Accessor,
	Document,
	type Mesh,
	Node,
	type Primitive,
	type Transform,
	type TypedArrayConstructor,
	type vec2,
} from '@gltf-transform/core';
import type * as watlas from 'watlas';
import { compactPrimitive } from './compact-primitive.js';
import { dequantizeAttributeArray } from './dequantize.js';
import { createTransform, isUsed, shallowCloneAccessor } from './utils.js';

const NAME = 'unwrap';

interface IWatlas {
	Initialize(): Promise<void>;
	Atlas: {
		new (): watlas.Atlas;
	};
}

/** Options for the {@link unwrap} transform. */
export interface UnwrapOptions {
	/** watlas instance. */
	watlas: unknown;
	/**
	 * Target texture coordinate index (0, 1, 2, ...) for generated unwrapping.
	 * Default: 0.
	 */
	texcoord?: number;
	/**
	 * Whether to overwrite existing attributes at the target texCoord index, if
	 * any. Default: false.
	 */
	overwrite?: boolean;
	/**
	 * Methods of grouping texcoords with the {@link unwrap} function.
	 * Default: 'mesh'.
	 */
	groupBy?: 'primitive' | 'mesh' | 'scene';
}

/** Options for the {@link unwrapPrimitives} function. */
export interface UnwrapPrimitivesOptions {
	/** watlas instance. */
	watlas: unknown;
	/**
	 * Target texture coordinate index (0, 1, 2, ...) for generated unwrapping.
	 * Default: 0.
	 */
	texcoord?: number;
	/**
	 * Whether to overwrite existing attributes at the target texCoord index, if
	 * any. Default: false.
	 */
	overwrite?: boolean;
	/**
	 * Per-primitive texel density weights. Texel space in the atlas is allocated
	 * proportionally with geometry dimensions in local space. If specified,
	 * weights scale the allocation. Default: [1, 1, 1, ...].
	 */
	weights?: number[];
}

export const UNWRAP_DEFAULTS: Required<Omit<UnwrapOptions, 'watlas'>> = {
	texcoord: 0,
	overwrite: false,
	groupBy: 'mesh',
};

/**
 * Generate new texture coordinates (“UV mappings”) for {@link Primitive Primitives}.
 * Useful for adding texture coordinates in scenes without existing UVs, or for
 * creating a second set of texture coordinates for baked textures such as ambient
 * occlusion maps and lightmaps. Operation may increase vertex count to
 * accommodate UV seams.
 *
 * UV layouts may be grouped, reducing the number of textures required. Available
 * groupings:
 *
 * - `"primitive"`: Each primitive is given it's own texcoord atlas.
 * - `"mesh"`: All primitives in a mesh share a texcoord atlas. (default)
 * - `"scene"`: All primitives in the scene share a texcoord atlas.
 *
 * Example:
 *
 * ```ts
 * import * as watlas from 'watlas';
 * import { unwrap } from '@gltf-transform/functions';
 *
 * // Generate a TEXCOORD_1 attribute for all primitives.
 * await document.transform(
 *   unwrap({ watlas, texcoord: 1, overwrite: true, groupBy: 'scene' })
 * );
 * ```
 *
 * For more control and customization, see {@link unwrapPrimitives}.
 *
 * @experimental
 * @category Transforms
 */
export function unwrap(_options: UnwrapOptions): Transform {
	const options = { ...UNWRAP_DEFAULTS, ..._options } as Required<UnwrapOptions>;

	const watlas = options.watlas as IWatlas | undefined;

	if (!watlas) {
		throw new Error(`${NAME}: dependency required — install "watlas".`);
	}

	return createTransform(NAME, async (document: Document): Promise<void> => {
		await watlas!.Initialize();

		switch (options.groupBy) {
			case 'primitive': {
				for (const mesh of document.getRoot().listMeshes()) {
					for (const prim of mesh.listPrimitives()) {
						unwrapPrimitives([prim], options);
					}
				}
				break;
			}
			case 'mesh': {
				for (const mesh of document.getRoot().listMeshes()) {
					unwrapPrimitives(mesh.listPrimitives(), options);
				}
				break;
			}
			case 'scene': {
				const prims: Primitive[] = [];
				const weights: number[] = [];
				for (const mesh of document.getRoot().listMeshes()) {
					const weight = getNodeScaleMax(mesh);
					for (const prim of mesh.listPrimitives()) {
						prims.push(prim);
						weights.push(weight);
					}
				}
				unwrapPrimitives(prims, { ...options, weights });
				break;
			}
		}

		const logger = document.getLogger();
		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * Generate new texture coordinates (“UV mappings”) for {@link Primitive Primitives}.
 * Useful for adding texture coordinates in scenes without existing UVs, or for
 * creating a second set of texture coordinates for baked textures such as ambient
 * occlusion maps and lightmaps. Operation may increase vertex count to
 * accommodate UV seams.
 *
 * UV layouts may be grouped, reducing the number of textures required. Available
 * groupings:
 *
 * - `"primitive"`: Each primitive is given it's own texcoord atlas.
 * - `"mesh"`: All primitives in a mesh share a texcoord atlas. (default)
 * - `"scene"`: All primitives in the scene share a texcoord atlas.
 *
 * watlas must be initialized before calling this function.
 *
 * Example:
 *
 * ```ts
 * import * as watlas from 'watlas';
 * import { unwrapPrimitives } from '@gltf-transform/functions';
 *
 * // Initialize watlas.
 * await watlas.Initialize();
 *
 * // Generate a TEXCOORD_1 attribute for the specified primitives.
 * unwrapPrimitives(mesh.listPrimitives(), {
 *   watlas,
 *   texcoord: 1,
 *   overwrite: true
 * });
 * ```
 *
 * To create texture coordinates for an entire Document, see {@link unwrap}.
 *
 * @experimental
 */
export function unwrapPrimitives(primitives: Primitive[], options: UnwrapPrimitivesOptions): void {
	const document = Document.fromGraph(primitives[0].getGraph())!;
	const watlas = options.watlas as IWatlas | undefined;
	const dstTexCoordIndex = options.texcoord ?? 0;
	const dstSemantic = `TEXCOORD_${dstTexCoordIndex}`;

	if (!watlas) {
		throw new Error(`${NAME}: dependency required — install "watlas".`);
	}

	const atlas = new watlas.Atlas();

	const unwrapPrims = [];
	for (let i = 0; i < primitives.length; i++) {
		const prim = primitives[i];
		const primWeight = options.weights ? options.weights[i] : 1;

		// Don't process primitives that already have the desired TEXCOORD index
		// if overwrite is false.
		if (!options.overwrite && prim.getAttribute(dstSemantic)) {
			continue;
		}

		const unwrapPrim = compactPrimitive(prim);

		// Always pass vertex position data
		const position = unwrapPrim.getAttribute('POSITION')!;

		const meshDecl: watlas.MeshDecl = {
			vertexCount: position.getCount(),
			vertexPositionData: getScaledAttributeFloat32Array(position, primWeight),
			vertexPositionStride: position.getElementSize() * Float32Array.BYTES_PER_ELEMENT,
		};

		// Pass normal data if available to improve unwrapping
		const normal = unwrapPrim.getAttribute('NORMAL');
		if (normal) {
			meshDecl.vertexNormalData = getAttributeFloat32Array(normal);
			meshDecl.vertexNormalStride = normal.getElementSize() * Float32Array.BYTES_PER_ELEMENT;
		}

		// Pass texcoord data from set 0 if it's available and not the set that
		// is being generated.
		if (options.texcoord !== 0) {
			const texcoord = unwrapPrim.getAttribute('TEXCOORD_0');
			if (texcoord) {
				meshDecl.vertexUvData = getAttributeFloat32Array(texcoord);
				meshDecl.vertexUvStride = texcoord.getElementSize() * Float32Array.BYTES_PER_ELEMENT;
			}
		}

		// Pass indices if available
		const indices = unwrapPrim.getIndices();
		if (indices) {
			const indicesArray = indices.getArray()!;
			meshDecl.indexCount = indices.getCount();
			meshDecl.indexData =
				indicesArray instanceof Uint8Array
					? new Uint16Array(indicesArray)
					: (indicesArray as Uint16Array | Uint32Array);
		}

		unwrapPrims.push(unwrapPrim);
		atlas.addMesh(meshDecl);
	}

	// Don't proceed if we skipped every primitive in this group.
	if (unwrapPrims.length === 0) {
		return;
	}

	atlas.generate();

	if (atlas.meshCount !== unwrapPrims.length) {
		throw new Error(
			`${NAME}: Generated an unexpected number of atlas meshes. (got: ${atlas.meshCount}, expected: ${unwrapPrims.length})`,
		);
	}

	// xatlas UVs are in texels, so they need to be normalized before saving to
	// the glTF attribute.
	const scale: vec2 = [1 / atlas.width, 1 / atlas.height];

	for (let i = 0; i < atlas.meshCount; i++) {
		const prim = unwrapPrims[i];
		const atlasMesh = atlas.getMesh(i);

		// Clean up previous TEXCOORD_* attribute, if there was any.
		const srcTexCoord = prim.getAttribute(dstSemantic);
		if (srcTexCoord) {
			prim.setAttribute(dstSemantic, null);
			if (!isUsed(srcTexCoord)) srcTexCoord.dispose();
		}

		// Remap Vertex attributes.
		for (const srcAttribute of prim.listAttributes()) {
			prim.swap(srcAttribute, remapAttribute(document, srcAttribute, atlasMesh));

			// Clean up.
			if (!isUsed(srcAttribute)) srcAttribute.dispose();
		}

		// Remap morph target vertex attributes.
		for (const target of prim.listTargets()) {
			for (const srcAttribute of target.listAttributes()) {
				target.swap(srcAttribute, remapAttribute(document, srcAttribute, atlasMesh));

				// Clean up.
				if (!isUsed(srcAttribute)) srcAttribute.dispose();
			}
		}

		// Add new TEXCOORD_* attribute.
		const dstTexCoord = document
			.createAccessor()
			.setArray(new Float32Array(atlasMesh.vertexCount * 2))
			.setType('VEC2');
		for (let j = 0; j < atlasMesh.vertexCount; j++) {
			const vertex = atlasMesh.getVertex(j);
			dstTexCoord.setElement(j, [vertex.uv[0] * scale[0], vertex.uv[1] * scale[1]]);
		}
		prim.setAttribute(dstSemantic, dstTexCoord);

		// The glTF spec says that if TEXCOORD_N (where N > 0) exists then
		// TEXCOORD_N-1...TEXCOORD_0 must also exist. If any prior TEXCOORD
		// attributes are missing, copy this attribute to satisfy that requirement.
		for (let j = dstTexCoordIndex - 1; j >= 0; j--) {
			const semantic = `TEXCOORD_${j}`;
			if (!prim.getAttribute(semantic)) {
				prim.setAttribute(semantic, dstTexCoord);
			}
		}

		// Update Indices.
		const dstIndicesArray = new Uint32Array(atlasMesh.indexCount);
		atlasMesh.getIndexArray(dstIndicesArray);

		const dstIndices = document.createAccessor().setArray(dstIndicesArray).setType('SCALAR');
		const srcIndices = prim.getIndices();
		prim.setIndices(dstIndices);
		if (srcIndices && !isUsed(srcIndices)) {
			srcIndices.dispose();
		}
	}

	atlas.delete();
}

// Returns a new attribute with the same values at as source attribute, but
// re-ordered according to the vertex order output by xatlas to account for
// vertex splitting.
function remapAttribute(document: Document, srcAttribute: Accessor, atlasMesh: watlas.Mesh): Accessor {
	const dstAttribute = shallowCloneAccessor(document, srcAttribute);
	const ArrayCtor = srcAttribute.getArray()!.constructor as TypedArrayConstructor;
	dstAttribute.setArray(new ArrayCtor(atlasMesh.vertexCount * srcAttribute.getElementSize()));

	const el: number[] = [];
	for (let i = 0; i < atlasMesh.vertexCount; i++) {
		const vertex = atlasMesh.getVertex(i);
		dstAttribute.setElement(i, srcAttribute.getElement(vertex.xref, el));
	}

	return dstAttribute;
}

// Returns the values of the given attribute as a Float32Array.
function getAttributeFloat32Array(attribute: Accessor): Float32Array {
	if (attribute.getComponentType() === Accessor.ComponentType.FLOAT) {
		return attribute.getArray() as Float32Array;
	}
	return dequantizeAttributeArray(attribute.getArray()!, attribute.getComponentType(), attribute.getNormalized());
}

// Returns scaled values of the given attribute as a Float32Array.
function getScaledAttributeFloat32Array(attribute: Accessor, scale: number): Float32Array {
	const array = dequantizeAttributeArray(
		attribute.getArray()!,
		attribute.getComponentType(),
		attribute.getNormalized(),
	);

	for (let i = 0; i < array.length; i++) {
		array[i] *= scale;
	}

	return array;
}

function getNodeScaleMax(mesh: Mesh): number {
	let scale = -Infinity;

	for (const parent of mesh.listParents()) {
		if (parent instanceof Node) {
			const s = parent.getWorldScale();
			scale = Number.isFinite(s[0]) ? Math.max(scale, Math.abs(s[0])) : scale;
			scale = Number.isFinite(s[1]) ? Math.max(scale, Math.abs(s[1])) : scale;
			scale = Number.isFinite(s[2]) ? Math.max(scale, Math.abs(s[2])) : scale;
		}
	}

	return scale > 0 && Number.isFinite(scale) ? scale : 1;
}
