import { Accessor, Document, ILogger, Primitive, Transform, TypedArray, uuid } from '@gltf-transform/core';
import { createTransform } from './utils.js';

const NAME = 'tangents';

/** Options for the {@link tangents} function. */
export interface TangentsOptions {
	/**
	 * Callback function to generate tangents from position, uv, and normal attributes.
	 * Generally, users will want to provide the `generateTangents` from the
	 * [mikktspace](https://github.com/donmccurdy/mikktspace-wasm) library, which is not
	 * included by default.
	 */
	generateTangents?: (pos: Float32Array, norm: Float32Array, uv: Float32Array) => Float32Array;
	/** Whether to overwrite existing `TANGENT` attributes. */
	overwrite?: boolean;
}

const TANGENTS_DEFAULTS: Required<Omit<TangentsOptions, 'generateTangents'>> = {
	overwrite: false,
};

/**
 * Generates MikkTSpace vertex tangents for mesh primitives, which may fix rendering issues
 * occuring with some baked normal maps. Requires access to the [mikktspace](https://github.com/donmccurdy/mikktspace-wasm)
 * WASM package, or equivalent.
 *
 * Example:
 *
 * ```ts
 * import { generateTangents } from 'mikktspace';
 * import { tangents } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	tangents({generateTangents})
 * );
 * ```
 *
 * @category Transforms
 */
export function tangents(_options: TangentsOptions = TANGENTS_DEFAULTS): Transform {
	if (!_options.generateTangents) {
		throw new Error(`${NAME}: generateTangents callback required — install "mikktspace".`);
	}

	const options = { ...TANGENTS_DEFAULTS, ..._options } as Required<TangentsOptions>;

	return createTransform(NAME, (doc: Document): void => {
		const logger = doc.getLogger();
		const attributeIDs = new Map<TypedArray, string>();
		const tangentCache = new Map<string, Accessor>();
		let modified = 0;

		for (const mesh of doc.getRoot().listMeshes()) {
			const meshName = mesh.getName();
			const meshPrimitives = mesh.listPrimitives();

			for (let i = 0; i < meshPrimitives.length; i++) {
				const prim = meshPrimitives[i];

				// Skip primitives for which we can't compute tangents.
				if (!filterPrimitive(prim, logger, meshName, i, options.overwrite)) continue;

				const texcoordSemantic = getNormalTexcoord(prim);

				// Nullability conditions checked by filterPrimitive() above.
				const position = prim.getAttribute('POSITION')!.getArray()!;
				const normal = prim.getAttribute('NORMAL')!.getArray()!;
				const texcoord = prim.getAttribute(texcoordSemantic)!.getArray()!;

				// Compute UUIDs for each attribute.
				const positionID = attributeIDs.get(position) || uuid();
				attributeIDs.set(position, positionID);

				const normalID = attributeIDs.get(normal) || uuid();
				attributeIDs.set(normal, normalID);

				const texcoordID = attributeIDs.get(texcoord) || uuid();
				attributeIDs.set(texcoord, texcoordID);

				// Dispose of previous TANGENT accessor if only used by this primitive (and Root).
				const prevTangent = prim.getAttribute('TANGENT');
				if (prevTangent && prevTangent.listParents().length === 2) prevTangent.dispose();

				// If we've already computed tangents for this pos/norm/uv set, reuse them.
				const attributeHash = `${positionID}|${normalID}|${texcoordID}`;
				let tangent = tangentCache.get(attributeHash);
				if (tangent) {
					logger.debug(`${NAME}: Found cache for primitive ${i} of mesh "${meshName}".`);
					prim.setAttribute('TANGENT', tangent);
					modified++;
					continue;
				}

				// Otherwise, generate tangents with the 'mikktspace' WASM library.
				logger.debug(`${NAME}: Generating for primitive ${i} of mesh "${meshName}".`);
				const tangentBuffer = prim.getAttribute('POSITION')!.getBuffer();
				const tangentArray = options.generateTangents(
					position instanceof Float32Array ? position : new Float32Array(position),
					normal instanceof Float32Array ? normal : new Float32Array(normal),
					texcoord instanceof Float32Array ? texcoord : new Float32Array(texcoord)
				);

				// See: https://github.com/KhronosGroup/glTF-Sample-Models/issues/174
				for (let i = 3; i < tangentArray.length; i += 4) tangentArray[i] *= -1;

				tangent = doc.createAccessor().setBuffer(tangentBuffer).setArray(tangentArray).setType('VEC4');
				prim.setAttribute('TANGENT', tangent);

				tangentCache.set(attributeHash, tangent);
				modified++;
			}
		}

		if (!modified) {
			logger.warn(`${NAME}: No qualifying primitives found. See debug output.`);
		} else {
			logger.debug(`${NAME}: Complete.`);
		}
	});
}

function getNormalTexcoord(prim: Primitive): string {
	const material = prim.getMaterial();
	if (!material) return 'TEXCOORD_0';

	const normalTextureInfo = material.getNormalTextureInfo();
	if (!normalTextureInfo) return 'TEXCOORD_0';

	const texcoord = normalTextureInfo.getTexCoord();
	const semantic = `TEXCOORD_${texcoord}`;
	if (prim.getAttribute(semantic)) return semantic;

	return 'TEXCOORD_0';
}

function filterPrimitive(prim: Primitive, logger: ILogger, meshName: string, i: number, overwrite: boolean): boolean {
	if (
		prim.getMode() !== Primitive.Mode.TRIANGLES ||
		!prim.getAttribute('POSITION') ||
		!prim.getAttribute('NORMAL') ||
		!prim.getAttribute('TEXCOORD_0')
	) {
		logger.debug(
			`${NAME}: Skipping primitive ${i} of mesh "${meshName}": primitives must` +
				' have attributes=[POSITION, NORMAL, TEXCOORD_0] and mode=TRIANGLES.'
		);
		return false;
	}

	if (prim.getAttribute('TANGENT') && !overwrite) {
		logger.debug(`${NAME}: Skipping primitive ${i} of mesh "${meshName}": TANGENT found.`);
		return false;
	}

	if (prim.getIndices()) {
		// TODO(feat): Do this automatically for qualifying primitives.
		logger.warn(`${NAME}: Skipping primitive ${i} of mesh "${meshName}": primitives must` + ' be unwelded.');
		return false;
	}

	return true;
}
