import {
	ColorUtils,
	Document,
	Material,
	Primitive,
	PropertyType,
	Texture,
	TextureInfo,
	Transform,
	vec2,
	vec3,
} from '@gltf-transform/core';
import { getPixels } from 'ndarray-pixels';
import { createTransform } from './utils.js';
import type { NdArray } from 'ndarray';
import { prune } from './prune.js';

const NAME = 'vertexPaint';

/** Options for the {@link colorspace} function. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VertexPaintOptions {}

const VERTEX_PAINT_DEFAULTS: VertexPaintOptions = {};

/**
 * Paints each {@link Material}'s base color texture to vertex colors, and removes the texture.
 *
 * Example:
 *
 * ```javascript
 * import { vertexPaint } from '@gltf-transform/functions';
 *
 * const mesh = document.getRoot().listMeshes()
 * 	.find((mesh) => mesh.getName() === 'MyMesh');
 * const prim = mesh.listPrimitives()[0];
 *
 * prim.getAttribute('COLOR_0'); // → null
 *
 * await document.transform(vertexPaint());
 *
 * prim.getAttribute('COLOR_0'); // → Accessor
 * ```
 */
export function vertexPaint(_options: VertexPaintOptions = VERTEX_PAINT_DEFAULTS): Transform {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const options = { ...VERTEX_PAINT_DEFAULTS, ..._options } as Required<VertexPaintOptions>;

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const root = document.getRoot();
		const logger = document.getLogger();

		const texturePixels = new Map<Texture, NdArray<Uint8Array>>();

		// Pre-process; load pixel data into memory.
		for (const material of root.listMaterials()) {
			const texture = material.getBaseColorTexture();
			if (!texture) continue;

			const pixels = await getPixels(texture.getImage()!, texture.getMimeType());
			texturePixels.set(texture, pixels as NdArray<Uint8Array>);
		}

		// For each mesh primitive, paint vertex colors.
		for (const mesh of root.listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				_vertexPaintPrimitive(document, prim, texturePixels);
			}
		}

		// Clean up unused textures and texture coordinates.
		for (const [texture] of texturePixels) {
			texture.dispose();
		}
		await document.transform(prune({ propertyTypes: [PropertyType.ACCESSOR] }));

		logger.debug(`${NAME}: Complete.`);
	});
}

function _vertexPaintPrimitive(
	document: Document,
	prim: Primitive,
	texturePixels: Map<Texture, NdArray<Uint8Array>>
): void {
	const material = prim.getMaterial();
	if (!material) return;

	const texture = material.getBaseColorTexture();
	const textureInfo = material.getBaseColorTextureInfo();
	if (!texture || !textureInfo) return;

	const texCoord = textureInfo.getTexCoord();
	const uv = prim.getAttribute(`TEXCOORD_${texCoord}`)!;
	const color = document
		.createAccessor()
		.setArray(new Float32Array(uv.getCount() * 3))
		.setBuffer(uv.getBuffer())
		.setType('VEC3');

	const pixels = texturePixels.get(texture)!;

	const _uv = [0, 0] as vec2;
	const _color = [0, 0, 0] as vec3;

	// Read color from texture, write to COLOR_0 vertex attribute.
	for (let i = 0, il = uv.getCount(); i < il; i++) {
		uv.getElement(i, _uv);
		const x = Math.floor(_uv[0] * pixels.shape[0]);
		const y = Math.floor(_uv[1] * pixels.shape[1]);

		_color[0] = pixels.get(x, y, 0) / 255;
		_color[1] = pixels.get(x, y, 1) / 255;
		_color[2] = pixels.get(x, y, 2) / 255;

		ColorUtils.convertSRGBToLinear(_color, _color);

		color.setElement(i, _color);
	}

	prim.setAttribute('COLOR_0', color);

	if (!_isTexCoordRequired(material, texCoord)) {
		prim.setAttribute(`TEXCOORD_${texCoord}`, null);
	}
}

function _isTexCoordRequired(material: Material, texCoord: number): boolean {
	const graph = material.getGraph();
	const edges = graph.listChildEdges(material);
	const textureNames = new Set<string>();

	// Gather list of Textures present on the material.
	for (const edge of edges) {
		if (edge.getChild() instanceof Texture) {
			textureNames.add(edge.getName());
		}
	}

	// Check the texCoord for each TextureInfo. Because TextureInfos are never
	// attached/detached, also compare with the attached textures.
	for (const edge of edges) {
		const child = edge.getChild();
		if (
			child instanceof TextureInfo &&
			child.getTexCoord() === texCoord &&
			textureNames.has(edge.getName().replace(/Info$/, ''))
		) {
			return true;
		}
	}

	return false;
}
