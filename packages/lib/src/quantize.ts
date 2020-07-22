import { Accessor, Animation, Document, Logger, Mesh, Node, Transform, TypedArray, vec2, vec3 } from '@gltf-transform/core';
import { MeshQuantization } from '@gltf-transform/extensions';

const NAME = 'quantize';

interface QuantizeOptions {
	position?: 8 | 16;
	normal?: 8 | 16;
	texcoord?: 8 | 16;
}

const DEFAULT_OPTIONS: QuantizeOptions =  {
	position: 16,
	normal: 8,
	texcoord: 16,
};

const quantize = (options: QuantizeOptions): Transform => {

	options = {...DEFAULT_OPTIONS, ...options};

	return (doc: Document): void => {

		doc.createExtension(MeshQuantization).setRequired(true);

		const logger = doc.getLogger();

		const tmpAttribute = doc.createAccessor('_TMP');

		try {

			for (const mesh of doc.getRoot().listMeshes()) {
				const min = [Infinity, Infinity, Infinity] as vec3;
				const max = [-Infinity, -Infinity, -Infinity] as vec3;
				const positions = mesh.listPrimitives()
					.map((prim) => prim.getAttribute('POSITION'));
				flatBounds<vec3>(min, max, positions);
				const scale = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
				const isSkinnedMesh = !!mesh.listPrimitives()
					.find((prim) => prim.getAttribute('JOINTS_0'));
				// eslint-disable-next-line max-len
				logger.debug(`${NAME}: Quantizing "${mesh.getName()}" ... scale=${scale.toFixed(5)}`);

				for (const primitive of mesh.listPrimitives()) {
					for (const semantic of primitive.listSemantics()) {
						const attribute = primitive.getAttribute(semantic);
						if (semantic === 'POSITION') {
							if (isSkinnedMesh) {
								// TODO(feat): Apply transforms to IBMs for skinned mesh.
								logger.warn(`${NAME}: Skipping skinned mesh, not yet supported.`);
								continue;
							}
							const bits = options.position;
							const vertexScale = scale ? 1 / scale : 0;
							logger.debug(`max before: ${attribute.getMaxNormalized([]).map(n => n.toFixed(3))}`);
							quantizeAttribute(attribute, tmpAttribute, bits === 8 ? Uint8Array : Uint16Array, bits, false, min, vertexScale);
							logger.debug(`max after: ${attribute.getMaxNormalized([]).map(n => n.toFixed(3))}`);
						} else if (semantic === 'NORMAL') {
							// TODO(feat): Implement.
						} else if (semantic === 'TANGENT') {
							// TODO(feat): Implement.
						} else if (semantic.startsWith('COLOR_')) {
							// quantizeAttribute(attribute, tmpAttribute, Uint8Array, 8, true);
						} else if (semantic.startsWith('TEXCOORD_')) {
							// const bits = options.texcoord;
							// const uvMin = attribute.getMinNormalized([]);
							// const uvMax = attribute.getMaxNormalized([]);
							// if (Math.min(...uvMin) < 0 || Math.max(...uvMax) > 1) {
							// 	// TODO(feat): Implement KHR_texture_transform and quantize UVs outside of [0,1].
							// 	logger.warn(`${NAME}: Skipping ${semantic} attribute; quantize transform does not yet support KHR_texture_transform.`);
							// 	continue;
							// }
							// quantizeAttribute(attribute, tmpAttribute, bits === 8 ? Uint8Array : Uint16Array, bits, true);
						} else if (semantic.startsWith('JOINTS_')) {
							const bits = Math.max(...attribute.getMax([])) <= 255 ? 8 : 16;
							quantizeAttribute(attribute, tmpAttribute, bits === 8 ? Uint8Array : Uint16Array, bits, false);
						} else if (semantic.startsWith('WEIGHTS_')) {
							// TODO(feat): Normalize and uncomment.
							// quantizeAttribute(attribute, tmpAttribute, Uint8Array, 8, true);
						}
					}

					if (primitive.listTargets().length) {
						// TODO(feat): Quantize morph targets.
						logger.warn(`${NAME}: Skipping morph targets; quantize transform does not yet affect them.`);
					}
				}

				if (!isSkinnedMesh && mesh.listPrimitives().length) {
					transformMeshParents(doc, mesh, min, scale / ((1 << options.position) - 1));
				}
			}

		} finally {

			tmpAttribute.dispose();

		}

		logger.debug(`${NAME}: Complete.`);
	};

}

/** Computes total min and max of all Accessors in a list. */
function flatBounds<T = vec2 | vec3>(targetMin: T, targetMax: T, accessors: Accessor[]): void {
	const elementSize = accessors[0].getElementSize();
	for (let i = 0; i < elementSize; i++) targetMin[i] = Infinity;
	for (let i = 0; i < elementSize; i++) targetMax[i] = -Infinity;

	const tmpMin = [];
	const tmpMax = [];

	for (const accessor of accessors) {
		accessor.getMinNormalized(tmpMin);
		accessor.getMaxNormalized(tmpMax);
		for (let i = 0; i < elementSize; i++) {
			targetMin[i] = Math.min(targetMin[i], tmpMin[i]);
			targetMax[i] = Math.max(targetMax[i], tmpMax[i]);
		}
	}
}

/** Applies corrective scale and offset to nodes referencing a quantized Mesh. */
function transformMeshParents(doc: Document, mesh: Mesh, offset: vec3, scale: number): void {
	for (const parent of mesh.listParents()) {
		if (parent instanceof Node) {
			const isParentNode = parent.listChildren().length > 0;
			const isAnimated = !!parent.listParents().find((p) => p instanceof Animation);

			let targetNode: Node;

			if (isParentNode || isAnimated) {
				targetNode = doc.createNode('').setMesh(mesh);
				parent.addChild(targetNode).setMesh(null);
			} else {
				targetNode = parent;
			}

			const t = targetNode.getTranslation();
			const s = targetNode.getScale();
			targetNode
				.setTranslation([t[0] + offset[0], t[1] + offset[1], t[2] + offset[2]])
				.setScale([s[0] * scale, s[1] * scale, s[2] * scale]);
		}
	}
}

/** Quantizes an attribute to the given parameters. */
function quantizeAttribute(
		attribute: Accessor,
		tmpAttribute: Accessor,
		ctor: new(n: number) => TypedArray,
		bits: number,
		normalized: boolean,
		offset: vec3 = null,
		scale: number = null,
	): void {

	if (attribute.getComponentSize() <= bits / 8) return;

	const prevArray = attribute.getArray();
	const nextArray = new ctor(prevArray.length);

	// console.log(`norm=${normalized}, offset=${offset}, scale=${scale}`);

	tmpAttribute
		.setType(attribute.getType())
		.setArray(nextArray)
		.setNormalized(normalized);

	const pos = [];
	for (let i = 0; i < attribute.getCount(); i++) {
		attribute.getElement(i, pos);
		// console.log('(' + pos + ' - ' + offset +  ') * ' + scale);
		if (offset !== null && scale !== null) {
			pos[0] = floatToInt((pos[0] - offset[0]) * scale, tmpAttribute.getComponentType());
			pos[1] = floatToInt((pos[1] - offset[1]) * scale, tmpAttribute.getComponentType());
			pos[2] = floatToInt((pos[2] - offset[2]) * scale, tmpAttribute.getComponentType());
		}
		tmpAttribute.setElement(i, pos);
	}

	attribute
		.setArray(nextArray)
		.setNormalized(normalized);
}

// TODO(cleanup): Import function from /core.
function floatToInt(f: number, componentType: GLTF.AccessorComponentType): number {
	switch (componentType) {
		case GLTF.AccessorComponentType.FLOAT:
			return f;
		case GLTF.AccessorComponentType.UNSIGNED_SHORT:
			return Math.round(f * 65535.0);
		case GLTF.AccessorComponentType.UNSIGNED_BYTE:
			return Math.round(f * 255.0);
		case GLTF.AccessorComponentType.SHORT:
			return Math.round(f * 32767.0);
		case GLTF.AccessorComponentType.BYTE:
			return Math.round(f * 127.0);
	}
}

export { quantize };
