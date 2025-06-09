import type { Document, Transform, TypedArray, Primitive, ILogger } from '@gltf-transform/core';
import { Accessor, PropertyType } from '@gltf-transform/core';
import { createTransform } from './utils';
import type * as watlas from 'watlas';
import { dequantizeAttributeArray } from './dequantize.js';
import { compactPrimitive } from './compact-primitive.js';

const NAME = 'unwrap';

export interface IWatlas {
	Initialize(): Promise<void>;
	Atlas: {
		new (): watlas.Atlas;
	};
}

/** Options for the {@link unwrapPrimitives} function. */
export interface UnwrapPrimitivesOptions {
	texCoord?: number;
	overwrite?: boolean;
	watlas?: IWatlas;
}

/**
 * Methods of grouping texcoords with the {@link unwrap} function.
 *  - PRIMITIVE: Each primitive is given it's own texcoord atlas.
 *  - MESH: All primitive in a mesh share a texcoord atlas. (Default)
 *  - SCENE: All primitives in the scene share a texcoord atlas.
 */
export type UnwrapGrouping = PropertyType.PRIMITIVE | PropertyType.MESH | PropertyType.SCENE;

/** Options for the {@link unwrap} transform. */
export interface UnwrapOptions extends UnwrapPrimitivesOptions {
	grouping?: UnwrapGrouping;
}

export const UNWRAP_DEFAULTS: UnwrapOptions = {
	texCoord: 0,
	overwrite: false,
	grouping: PropertyType.MESH,
};

/**
 * Generate new texcoords for all {@link Primitive}s in the document. Useful for
 * providing a base set of texcoords if none was included in the mesh or adding
 * a second set of texcoords for things like AO or lightmapping. This operation
 * may increase the number of vertices in the document's meshes.
 *
 * Example:
 *
 * ```ts
 * import * as watlas from 'watlas';
 * import { unwrap } from '@gltf-transform/functions';
 *
 * // Generate a TEXCOORD_1 attribute for all primitives.
 * await document.transform(unwrap({ watlas, texCoord: 1, overwrite: true }));
 * ```
 */
export function unwrap(_options: UnwrapOptions = UNWRAP_DEFAULTS): Transform {
	const options = { ...UNWRAP_DEFAULTS, ..._options } as Required<UnwrapOptions>;

	if (!options.watlas) {
		throw new Error('watlas not found!');
	}

	return createTransform(NAME, async (doc: Document): Promise<void> => {
		await options.watlas.Initialize();

		switch (options.grouping) {
			case PropertyType.PRIMITIVE: {
				for (const mesh of doc.getRoot().listMeshes()) {
					for (const prim of mesh.listPrimitives()) {
						unwrapPrimitives([prim], options, doc);
					}
				}
				break;
			}
			case PropertyType.MESH: {
				for (const mesh of doc.getRoot().listMeshes()) {
					unwrapPrimitives(mesh.listPrimitives(), options, doc);
				}
				break;
			}
			case PropertyType.SCENE: {
				const scenePrims = [];
				for (const mesh of doc.getRoot().listMeshes()) {
					scenePrims.push(...mesh.listPrimitives());
				}
				unwrapPrimitives(scenePrims, options, doc);
				break;
			}
		}

		const logger = doc.getLogger();
		logger.debug(`${NAME}: Complete.`);
	});
}

/**
 * Generate new texcoords for the specified {@link Primitive}s.
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
 * cosnt primitives = mesh.listPrimitives();
 * unwrapPrimitives(primitives, { watlas, texCoord: 1, overwrite: true }, doc));
 * ```
 */
export function unwrapPrimitives(primitives: Primitive[], options: UnwrapPrimitivesOptions, doc: Document) {
	const targetIndex = options.texCoord ?? 0;
	const targetAttribute = `TEXCOORD_${targetIndex}`;

	if (!options.watlas) {
		throw new Error('watlas not found!');
	}

	const atlas = new options.watlas!.Atlas();

	const unwrapPrims = [];
	for (const prim of primitives) {
		// Don't process primitives that already have the desired TEXCOORD index
		// if overwrite is false.
		if (!options.overwrite) {
			const texcoord = prim.getAttribute(targetAttribute);
			if (texcoord) continue;
		}

		const unwrapPrim = compactPrimitive(prim);
		unwrapPrims.push(unwrapPrim);

		// Always pass vertex position data
		const position = unwrapPrim.getAttribute('POSITION')!;

		const meshDecl: watlas.MeshDecl = {
			vertexCount: position.getCount(),
			vertexPositionData: getAttributeFloat32Array(position),
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
		if (options.texCoord !== 0) {
			const texcoord = unwrapPrim.getAttribute('TEXCOORD_0');
			if (texcoord) {
				meshDecl.vertexUvData = getAttributeFloat32Array(texcoord);
				meshDecl.vertexUvStride = texcoord.getElementSize() * Float32Array.BYTES_PER_ELEMENT;
			}
		}

		// Pass indices if available
		const indices = unwrapPrim.getIndices();
		if (indices) {
			meshDecl.indexCount = indices.getCount();
			const indexType = indices.getComponentType();
			switch (indexType) {
				case Accessor.ComponentType.UNSIGNED_SHORT:
				case Accessor.ComponentType.UNSIGNED_INT:
					// No change needed
					meshDecl.indexData = indices.getArray() as Uint32Array | Uint16Array;
					break;
				case Accessor.ComponentType.UNSIGNED_BYTE:
					// Expand the Uint8 values into Uint16 for processing by xatlas
					meshDecl.indexData = new Uint16Array(indices.getCount());
					meshDecl.indexData.set(indices.getArray()!);
					break;
				default:
					throw new Error(`${NAME}: Unsupported index type ${indexType}`);
			}
		}

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
	const uScale = 1 / atlas.width;
	const vScale = 1 / atlas.height;

	for (let i = 0; i < atlas.meshCount; ++i) {
		const prim = unwrapPrims[i];
		const atlasMesh = atlas.getMesh(i);

		// Clean up previous TEXCOORD_* attribute, if there was any.
		const oldTexcoord = prim.getAttribute(targetAttribute);
		if (oldTexcoord) {
			prim.setAttribute(targetAttribute, null);
			if (oldTexcoord.listParents().length === 1) oldTexcoord.dispose();
		}

		// Remap Vertex attributes.
		for (const srcAttribute of prim.listAttributes()) {
			prim.swap(srcAttribute, remapAttribute(srcAttribute, atlasMesh));

			// Clean up.
			if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
		}

		// Remap morph target vertex attributes.
		for (const target of prim.listTargets()) {
			for (const srcAttribute of target.listAttributes()) {
				target.swap(srcAttribute, remapAttribute(srcAttribute, atlasMesh));

				// Clean up.
				if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
			}
		}

		// Add new TEXCOORD_* attribute.
		const texcoord = doc
			.createAccessor()
			.setArray(new Float32Array(atlasMesh.vertexCount * 2))
			.setType('VEC2');
		for (let j = 0; j < atlasMesh.vertexCount; ++j) {
			const vertex = atlasMesh.getVertex(j);
			texcoord.setElement(j, [vertex.uv[0] * uScale, vertex.uv[1] * vScale]);
		}
		prim.setAttribute(targetAttribute, texcoord);

		// The glTF spec says that if TEXCOORD_N (where N > 0) exists then
		// TEXCOORD_N-1...TEXCOORD_0 must also exist. If any prior TEXCOORD
		// attributes are missing, copy this attribute to satisfy that requirement.
		for (let j = targetIndex - 1; j >= 0; --j) {
			const attibName = `TEXCOORD_${j}`;
			if (!prim.getAttribute(attibName)) {
				prim.setAttribute(attibName, texcoord);
			}
		}

		// Update Indices.
		const indexArray = new Uint32Array(atlasMesh.indexCount);
		atlasMesh.getIndexArray(indexArray);

		const newIndices = doc.createAccessor().setArray(indexArray).setType('SCALAR');

		const indices = prim.getIndices();
		prim.setIndices(newIndices);
		if (indices && indices.listParents().length === 1) {
			indices.dispose();
		}
	}

	atlas.delete();
}

// Returns a new attribute with the same values at as source attribute, but
// re-ordered according to the vertex order output by xatlas to account for
// vertex splitting.
function remapAttribute(srcAttribute: Accessor, atlasMesh: watlas.Mesh): Accessor {
	const dstAttribute = srcAttribute.clone();
	const ArrayCtor = srcAttribute.getArray()!.constructor as new (len: number) => TypedArray;
	dstAttribute.setArray(new ArrayCtor(atlasMesh.vertexCount * srcAttribute.getElementSize()));

	const el: number[] = [];
	for (let i = 0; i < atlasMesh.vertexCount; ++i) {
		const vertex = atlasMesh.getVertex(i);
		dstAttribute.setElement(i, srcAttribute.getElement(vertex.xref, el));
	}

	return dstAttribute;
}

// Returns the values of the given attribute as a Float32Array.
function getAttributeFloat32Array(attribute: Accessor): Float32Array {
	if (attribute.getComponentType() === Accessor.ComponentType.FLOAT) {
		return attribute.getArray()! as Float32Array;
	}
	return dequantizeAttributeArray(attribute.getArray()!, attribute.getComponentType(), attribute.getNormalized());
}
