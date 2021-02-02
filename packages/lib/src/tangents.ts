import { Document, Logger, Primitive, Transform } from '@gltf-transform/core';

const NAME = 'tangents';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TangentsOptions {}

const DEFAULT_OPTIONS: TangentsOptions = {};

export function tangents (_options: TangentsOptions = DEFAULT_OPTIONS): Transform {
	_options = {...DEFAULT_OPTIONS, ..._options};

	// TODO(cleanup): Package this up.
	const mikktspace = require('mikktspace');

	return (doc: Document): void => {
		const logger = doc.getLogger();
		let modified = 0;

		for (const mesh of doc.getRoot().listMeshes()) {
			const meshName = mesh.getName();
			const meshPrimitives = mesh.listPrimitives();

			for (let i = 0; i < meshPrimitives.length; i++) {
				const prim = meshPrimitives[i];


				if (!filterPrimitive(prim, logger, meshName, i)) continue;

				// TODO(bug): Ensure Float32Array, or support all.
				// TODO(bug): Cache P/N/T set, reuse existing tangents.
				const tangentBuffer = prim.getAttribute('POSITION').getBuffer();
				const tangentArray = mikktspace.computeVertexTangents(
					prim.getAttribute('POSITION').getArray(),
					prim.getAttribute('NORMAL').getArray(),
					prim.getAttribute('TEXCOORD_0').getArray()
				);
				const tangent = doc.createAccessor()
					.setBuffer(tangentBuffer)
					.setArray(tangentArray)
					.setType('VEC4');
				prim.setAttribute('TANGENT', tangent);

				modified++;
			}
		}

		if (!modified) {
			logger.warn(`${NAME}: No qualifying primitives found. See debug output.`);
		} else {
			logger.debug(`${NAME}: Complete.`);
		}
	};
}

function filterPrimitive(prim: Primitive, logger: Logger, meshName: string, i: number): boolean {
	if (prim.getMode() !== Primitive.Mode.TRIANGLES
			|| !prim.getAttribute('POSITION')
			|| !prim.getAttribute('NORMAL')
			|| !prim.getAttribute('TEXCOORD_0')) {
		logger.debug(
			`${NAME}: Skipping primitive ${i} of mesh "${meshName}": primitives must`
			+ ' have attributes=[POSITION, NORMAL, TEXCOORD_0] and mode=TRIANGLES.'
		);
		return false;
	}

	if (prim.getAttribute('TANGENT')) {
		logger.debug(
			`${NAME}: Skipping primitive ${i} of mesh "${meshName}": TANGENT found.`
		);
		return false;
	}

	if (prim.getIndices()) {
		// TODO(feat): Do this automatically for qualifying primitives.
		logger.warn(
			`${NAME}: Skipping primitive ${i} of mesh "${meshName}": primitives must`
			+ ' be unwelded.'
		);
		return false;
	}

	return true;
}
