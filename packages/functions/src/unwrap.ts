import type { Document, Transform, TypedArray, Primitive, ILogger } from '@gltf-transform/core';
import type { MainModule as WATLASMODULE, WAddMeshError, WMeshDecl, WAtlasResult } from './watlas/watlas';
import { Accessor } from '@gltf-transform/core';
import { createTransform } from './utils';
import WAtlasModule, { WChartOptions, WPackOptions } from './watlas/watlas.js';

const NAME = 'unwrap';

/**
 * Methods of grouping texcoords with the {@link unwrap} function.
 *  - primitive: Each primitive is given it's own texcoord atlas.
 *  - mesh: All primitive in a mesh share a texcoord atlas. (Default)
 *  - scene: All primitives in the scene share a texcoord atlas.
 */
export type UnwrapGrouping = 'primitive' | 'mesh' | 'scene';

/** Options for the {@link unwrap} function. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnwrapOptions {
  index?: number,
  overwrite?: boolean,
  grouping?: UnwrapGrouping,
};

export const UNWRAP_DEFAULTS: UnwrapOptions = {
  index: 0,
  overwrite: false,
  grouping: 'mesh'
};

let WAtlasPromise: Promise<WATLASMODULE>;

/**
 * Generate new texcoords for all {@link Primitive}s. Useful for providing a
 * base set of texcoords if none was included in the mesh or adding a second set
 * of texcoords for things like AO or lightmapping. This operation may increase
 * the number of vertices in a mesh.
 *
 * Example:
 *
 * ```ts
 * import { unwrap } from '@gltf-transform/functions';
 *
 * // Generate a TEXCOORD_1 attribute for all primitives.
 * await document.transform(unwrap({ index: 1, overwrite: true }));
 * ```
 */
export function unwrap(_options: UnwrapOptions = UNWRAP_DEFAULTS): Transform {
  const options = { ...UNWRAP_DEFAULTS, ..._options } as Required<UnwrapOptions>;

  return createTransform(NAME, async (doc: Document): Promise<void> => {
    if (!WAtlasPromise) {
      WAtlasPromise = WAtlasModule();
    }

    const WATLAS = await WAtlasPromise;
    const logger = doc.getLogger();

    switch (options.grouping) {
      case 'primitive': {
        for (const mesh of doc.getRoot().listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            unwrapPrimitives([prim], options, logger, doc, WATLAS);
          }
        }
        break;
      }
      case 'mesh': {
        for (const mesh of doc.getRoot().listMeshes()) {
          unwrapPrimitives(mesh.listPrimitives(), options, logger, doc, WATLAS);
        }
        break;
      }
      case 'scene': {
        const scenePrims = [];
        for (const mesh of doc.getRoot().listMeshes()) {
          scenePrims.push(...mesh.listPrimitives());
        }
        unwrapPrimitives(scenePrims, options, logger, doc, WATLAS);
        break;
      }
    }

    logger.debug(`${NAME}: Complete.`);
  });
}

function getMeshErrorString(WATLAS: WATLASMODULE, err: WAddMeshError) {
  switch (err) {
    case WATLAS.WAddMeshError.Success: return 'Success';
    case WATLAS.WAddMeshError.Error: return 'Error';
    case WATLAS.WAddMeshError.IndexOutOfRange: return 'IndexOutOfRange';
    case WATLAS.WAddMeshError.InvalidFaceVertexCount: return 'InvalidFaceVertexCount';
    case WATLAS.WAddMeshError.InvalidIndexCount: return 'InvalidIndexCount';
    default: return 'Unknown';
  }
}

function unwrapPrimitives(
  primitives: Primitive[],
  options: UnwrapOptions,
  logger: ILogger,
  doc: Document,
  WATLAS: WATLASMODULE
) {
  const targetIndex = options.index ?? 0;
  const targetAttribute = `TEXCOORD_${targetIndex}`;

  const atlas = new WATLAS.WAtlas();

  let meshCount = 0;
  for (const prim of primitives) {
    // Don't process primitives that already have the desired TEXCOORD index
    // if overwrite is false.
    if (!options.overwrite) {
      const texcoord = prim.getAttribute(targetAttribute);
      if (texcoord) continue;
    }

    // Always pass vertex position data
    const position = prim.getAttribute('POSITION')!;
    const positionData = getFloat32AttributeData(position, 3);

    const meshDecl: Partial<WMeshDecl> = {
      vertexCount: position.getCount(),
      vertexPositionData: positionData.array,
      vertexPositionStride: positionData.stride,
    };

    // Pass normal data if available to improve unwrapping
    const normal = prim.getAttribute('NORMAL');
    if (normal) {
      const normalData = getFloat32AttributeData(normal, 3);
      meshDecl.vertexNormalData = normalData.array;
      meshDecl.vertexNormalStride = normalData.stride;
    }

    // Pass texcoord data from set 0 if it's available and not the set that
    // is being generated.
    if (options.index != 0) {
      const texcoord = prim.getAttribute('TEXCOORD_0');
      if (texcoord) {
        const texcoordData = getFloat32AttributeData(texcoord, 2);
        meshDecl.vertexUvData = texcoordData.array;
        meshDecl.vertexUvStride = texcoordData.stride;
      }
    }

    // Pass indices if available
    const indices = prim.getIndices();
    if (indices) {
      meshDecl.indexData = indices.getArray();
      meshDecl.indexCount = indices.getCount();
      const indexType = indices.getComponentType();
      switch (indexType) {
        case Accessor.ComponentType.UNSIGNED_SHORT:
          meshDecl.indexFormat = WATLAS.WIndexFormat.UInt16;
          break;
        case Accessor.ComponentType.UNSIGNED_INT:
          meshDecl.indexFormat = WATLAS.WIndexFormat.UInt32;
          break;
        case Accessor.ComponentType.UNSIGNED_BYTE:
          // Expand the Uint8 values into Uint16 for processing by xatlas
          meshDecl.indexData = new Uint16Array(indices.getCount());
          meshDecl.indexData.set(indices.getArray()!);
          meshDecl.indexFormat = WATLAS.WIndexFormat.UInt16;
          break;
        default:
          throw new Error(`${NAME}: Unsupported index type ${indexType}`);
          return;
      }
    }

    const result = atlas.addMesh(meshDecl as WMeshDecl);
    if (result != WATLAS.WAddMeshError.Success) {
      throw new Error(`${NAME}: Error adding mesh to atlas ${getMeshErrorString(WATLAS, result)}`);
    }

    meshCount++;
  }

  // Don't proceed if we skipped every primitive in this group.
  if (meshCount == 0) {
    return;
  }

  atlas.generate(
    {} as WChartOptions,
    {} as WPackOptions
  );

  const atlasResult: WAtlasResult = atlas.getResult();

  // xatlas UVs are in texels, so they need to be normalized before saving to
  // the glTF attribute.
  const uScale = 1/atlasResult.width;
  const vScale = 1/atlasResult.height;

  if (atlasResult.meshCount != primitives.length) {
    throw new Error(`${NAME}: Generated an unexpected number of atlas meshes. (got: ${atlasResult.meshCount}, expected: ${primitives.length})`);
  }

  for (let i = 0; i < atlasResult.meshCount; ++i) {
    const prim = primitives[i];
    const atlasMesh = atlasResult.meshes.get(i)!;

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
    const texcoord = doc.createAccessor()
                        .setArray(new Float32Array(atlasMesh.vertexCount * 2))
                        .setType('VEC2');
    for (let j = 0; j < atlasMesh.vertexCount; ++j) {
      const vertex = atlasMesh.vertexArray.get(j)!;
      texcoord.setElement(j, [vertex.uv[0] * uScale, vertex.uv[1] * vScale]);
    }
    prim.setAttribute(targetAttribute, texcoord);

    // The glTF spec says that if TEXCOORD_N (where N > 0) exists then
    // TEXCOORD_N-1...TEXCOORD_0 must also exist. If any prior TEXCOORD
    // attributes are missing, copy this attribute to satisfy that requirement.
    for (let j = targetIndex-1; j >= 0; --j) {
      const attibName = `TEXCOORD_${j}`;
      if (!prim.getAttribute(attibName)) {
        prim.setAttribute(attibName, texcoord);
      }
    }

    // Update Indices.
    const indexArray = new Uint32Array(atlasMesh.indexCount);
    indexArray.set(atlasMesh.indexArray);

    const newIndices = doc.createAccessor()
                          .setArray(indexArray)
                          .setType('SCALAR');

    const indices = prim.getIndices();
    if (indices) {
      prim.swap(indices, newIndices);
      if (indices.listParents().length === 1) indices.dispose();
    } else {
      prim.setIndices(newIndices);
    }
  }

  atlas.delete();
}

// Returns a new attribute with the same values at as source attribute, but
// re-ordered according to the vertex order output by xatlas to account for
// vertex splitting.
function remapAttribute(
  srcAttribute: Accessor,
  atlasMesh: any,
): Accessor {
  const dstAttribute = srcAttribute.clone();
	const ArrayCtor = srcAttribute.getArray()!.constructor as new (len: number) => TypedArray;
	dstAttribute.setArray(new ArrayCtor(atlasMesh.vertexCount * srcAttribute.getElementSize()));

  const el: number[] = [];
  for (let i = 0; i < atlasMesh.vertexCount; ++i) {
    const vertex = atlasMesh.vertexArray.get(i);
    dstAttribute.setElement(i, srcAttribute.getElement(vertex.xref, el));
  }

  return dstAttribute;
}

interface Float32AttributeData {
  stride: number,
  array: Float32Array,
}

// Returns the values of the given attribute as a Float32Array with the given
// number of components per element
function getFloat32AttributeData(srcAttribute: Accessor, minComponents: number): Float32AttributeData {
  if (srcAttribute.getElementSize() >= minComponents &&
      srcAttribute.getComponentType() == Accessor.ComponentType.FLOAT) {
    return {
      stride: srcAttribute.getElementSize() * Float32Array.BYTES_PER_ELEMENT,
      array: srcAttribute.getArray()! as Float32Array,
    }
  }

  const elementStride = Math.max(minComponents, srcAttribute.getElementSize())
  const dstArray = new Float32Array(srcAttribute.getCount() * elementStride);
  const el: number[] = [];
  for (let i = 0; i < srcAttribute.getCount(); ++i) {
    dstArray.set(srcAttribute.getElement(i, el), i * minComponents);
  }

  return {
    stride: elementStride  * Float32Array.BYTES_PER_ELEMENT,
    array: dstArray,
  };
}
