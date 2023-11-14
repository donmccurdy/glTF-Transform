import {
	AnimationChannel,
	ColorUtils,
	Document,
	ExtensionProperty,
	Graph,
	ILogger,
	Material,
	Node,
	Primitive,
	PrimitiveTarget,
	Property,
	PropertyType,
	Root,
	Scene,
	Texture,
	TextureInfo,
	Transform,
	vec3,
	vec4,
} from '@gltf-transform/core';
import { mul as mulVec3 } from 'gl-matrix/vec3';
import { add, create, len, mul, scale, sub } from 'gl-matrix/vec4';
import { NdArray } from 'ndarray';
import { getPixels } from 'ndarray-pixels';
import { getTextureColorSpace } from './get-texture-color-space.js';
import { listTextureInfoByMaterial } from './list-texture-info.js';
import { listTextureSlots } from './list-texture-slots.js';
import { createTransform } from './utils.js';

const NAME = 'prune';

const EPS = 3 / 255;

export interface PruneOptions {
	/** List of {@link PropertyType} identifiers to be de-duplicated.*/
	propertyTypes?: string[];
	/** Whether to keep empty leaf nodes. */
	keepLeaves?: boolean;
	/** Whether to keep unused vertex attributes, such as UVs without an assigned texture. */
	keepAttributes?: boolean;
	/** Whether to keep redundant mesh indices, where vertex count equals index count. */
	keepIndices?: boolean;
	/** Whether to keep single-color textures that can be converted to material factors. */
	keepSolidTextures?: boolean;
}
const PRUNE_DEFAULTS: Required<PruneOptions> = {
	propertyTypes: [
		PropertyType.NODE,
		PropertyType.SKIN,
		PropertyType.MESH,
		PropertyType.CAMERA,
		PropertyType.PRIMITIVE,
		PropertyType.PRIMITIVE_TARGET,
		PropertyType.ANIMATION,
		PropertyType.MATERIAL,
		PropertyType.TEXTURE,
		PropertyType.ACCESSOR,
		PropertyType.BUFFER,
	],
	keepLeaves: false,
	keepAttributes: true,
	keepIndices: true,
	keepSolidTextures: true,
};

/**
 * Removes properties from the file if they are not referenced by a {@link Scene}. Commonly helpful
 * for cleaning up after other operations, e.g. allowing a node to be detached and any unused
 * meshes, materials, or other resources to be removed automatically.
 *
 * Example:
 *
 * ```javascript
 * document.getRoot().listMaterials(); // → [Material, Material]
 *
 * await document.transform(prune());
 *
 * document.getRoot().listMaterials(); // → [Material]
 * ```
 *
 * Use {@link PruneOptions} to control what content should be pruned. For example, you can preserve
 * empty objects in the scene hierarchy using the option `keepLeaves`.
 *
 * @category Transforms
 */
export function prune(_options: PruneOptions = PRUNE_DEFAULTS): Transform {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const options = { ...PRUNE_DEFAULTS, ..._options } as Required<PruneOptions>;
	const propertyTypes = new Set(options.propertyTypes);

	return createTransform(NAME, async (document: Document): Promise<void> => {
		const logger = document.getLogger();
		const root = document.getRoot();
		const graph = document.getGraph();

		const counter = new DisposeCounter();

		// Prune top-down, so that low-level properties like accessors can be removed if the
		// properties referencing them are removed.

		// Prune empty Meshes.
		if (propertyTypes.has(PropertyType.MESH)) {
			for (const mesh of root.listMeshes()) {
				if (mesh.listPrimitives().length > 0) continue;
				counter.dispose(mesh);
			}
		}

		if (propertyTypes.has(PropertyType.NODE)) {
			if (!options.keepLeaves) {
				for (const scene of root.listScenes()) {
					nodeTreeShake(graph, scene, counter);
				}
			}

			for (const node of root.listNodes()) {
				treeShake(node, counter);
			}
		}

		if (propertyTypes.has(PropertyType.SKIN)) {
			for (const skin of root.listSkins()) {
				treeShake(skin, counter);
			}
		}

		if (propertyTypes.has(PropertyType.MESH)) {
			for (const mesh of root.listMeshes()) {
				treeShake(mesh, counter);
			}
		}

		if (propertyTypes.has(PropertyType.CAMERA)) {
			for (const camera of root.listCameras()) {
				treeShake(camera, counter);
			}
		}

		if (propertyTypes.has(PropertyType.PRIMITIVE)) {
			indirectTreeShake(graph, PropertyType.PRIMITIVE, counter);
		}

		if (propertyTypes.has(PropertyType.PRIMITIVE_TARGET)) {
			indirectTreeShake(graph, PropertyType.PRIMITIVE_TARGET, counter);
		}

		// Prune unused vertex attributes.
		if (!options.keepAttributes && propertyTypes.has(PropertyType.ACCESSOR)) {
			const materialPrims = new Map<Material, Set<Primitive>>();
			for (const mesh of root.listMeshes()) {
				for (const prim of mesh.listPrimitives()) {
					const material = prim.getMaterial();
					const required = listRequiredSemantics(document, material);
					const unused = listUnusedSemantics(prim, required);
					pruneAttributes(prim, unused);
					prim.listTargets().forEach((target) => pruneAttributes(target, unused));
					if (material) {
						materialPrims.has(material)
							? materialPrims.get(material)!.add(prim)
							: materialPrims.set(material, new Set([prim]));
					}
				}
			}
			for (const [material, prims] of materialPrims) {
				shiftTexCoords(material, Array.from(prims));
			}
		}

		// Prune unused mesh indices.
		if (!options.keepIndices && propertyTypes.has(PropertyType.ACCESSOR)) {
			for (const mesh of root.listMeshes()) {
				for (const prim of mesh.listPrimitives()) {
					pruneIndices(prim);
				}
			}
		}

		// Pruning animations is a bit more complicated:
		// (1) Remove channels without target nodes.
		// (2) Remove animations without channels.
		// (3) Remove samplers orphaned in the process.
		if (propertyTypes.has(PropertyType.ANIMATION)) {
			for (const anim of root.listAnimations()) {
				for (const channel of anim.listChannels()) {
					if (!channel.getTargetNode()) {
						counter.dispose(channel);
					}
				}
				if (!anim.listChannels().length) {
					const samplers = anim.listSamplers();
					treeShake(anim, counter);
					samplers.forEach((sampler) => treeShake(sampler, counter));
				} else {
					anim.listSamplers().forEach((sampler) => treeShake(sampler, counter));
				}
			}
		}

		if (propertyTypes.has(PropertyType.MATERIAL)) {
			root.listMaterials().forEach((material) => treeShake(material, counter));
		}

		if (propertyTypes.has(PropertyType.TEXTURE)) {
			root.listTextures().forEach((texture) => treeShake(texture, counter));
			if (!options.keepSolidTextures) {
				await pruneSolidTextures(document, counter);
			}
		}

		if (propertyTypes.has(PropertyType.ACCESSOR)) {
			root.listAccessors().forEach((accessor) => treeShake(accessor, counter));
		}

		if (propertyTypes.has(PropertyType.BUFFER)) {
			root.listBuffers().forEach((buffer) => treeShake(buffer, counter));
		}

		// TODO(bug): This process does not identify unused ExtensionProperty instances. That could
		// be a future enhancement, either tracking unlinked properties as if they were connected
		// to the Graph, or iterating over a property list provided by the Extension. Properties in
		// use by an Extension are correctly preserved, in the meantime.

		if (!counter.empty()) {
			const str = counter
				.entries()
				.map(([type, count]) => `${type} (${count})`)
				.join(', ');
			logger.info(`${NAME}: Removed types... ${str}`);
		} else {
			logger.info(`${NAME}: No unused properties found.`);
		}

		logger.debug(`${NAME}: Complete.`);
	});
}

/**********************************************************************************************
 * Utility for disposing properties and reporting statistics afterward.
 */

class DisposeCounter {
	public readonly disposed: Record<string, number> = {};

	empty(): boolean {
		for (const key in this.disposed) return false;
		return true;
	}

	entries(): [string, number][] {
		return Object.entries(this.disposed);
	}

	/** Records properties disposed by type. */
	dispose(prop: Property): void {
		this.disposed[prop.propertyType] = this.disposed[prop.propertyType] || 0;
		this.disposed[prop.propertyType]++;
		prop.dispose();
	}
}

/**********************************************************************************************
 * Helper functions for the {@link prune} transform.
 *
 * IMPORTANT: These functions were previously declared in function scope, but
 * broke in the CommonJS build due to a buggy Babel transform. See:
 * https://github.com/donmccurdy/glTF-Transform/issues/1140
 */

/** Disposes of the given property if it is unused. */
function treeShake(prop: Property, counter: DisposeCounter): void {
	// Consider a property unused if it has no references from another property, excluding
	// types Root and AnimationChannel.
	const parents = prop.listParents().filter((p) => !(p instanceof Root || p instanceof AnimationChannel));
	if (!parents.length) {
		counter.dispose(prop);
	}
}

/**
 * For property types the Root does not maintain references to, we'll need to search the
 * graph. It's possible that objects may have been constructed without any outbound links,
 * but since they're not on the graph they don't need to be tree-shaken.
 */
function indirectTreeShake(graph: Graph<Property>, propertyType: string, counter: DisposeCounter): void {
	for (const edge of graph.listEdges()) {
		const parent = edge.getParent();
		if (parent.propertyType === propertyType) {
			treeShake(parent, counter);
		}
	}
}

/** Iteratively prunes leaf Nodes without contents. */
function nodeTreeShake(graph: Graph<Property>, prop: Node | Scene, counter: DisposeCounter): void {
	prop.listChildren().forEach((child) => nodeTreeShake(graph, child, counter));

	if (prop instanceof Scene) return;

	const isUsed = graph.listParentEdges(prop).some((e) => {
		const ptype = e.getParent().propertyType;
		return ptype !== PropertyType.ROOT && ptype !== PropertyType.SCENE && ptype !== PropertyType.NODE;
	});
	const isEmpty = graph.listChildren(prop).length === 0;
	if (isEmpty && !isUsed) {
		counter.dispose(prop);
	}
}

function pruneAttributes(prim: Primitive | PrimitiveTarget, unused: string[]) {
	for (const semantic of unused) {
		prim.setAttribute(semantic, null);
	}
}

function pruneIndices(prim: Primitive) {
	const indices = prim.getIndices();
	const attribute = prim.listAttributes()[0];
	if (indices && attribute && indices.getCount() === attribute.getCount()) {
		prim.setIndices(null);
	}
}

/**
 * Lists vertex attribute semantics that are unused when rendering a given primitive.
 */
function listUnusedSemantics(prim: Primitive | PrimitiveTarget, required: Set<string>): string[] {
	const unused = [];
	for (const semantic of prim.listSemantics()) {
		if (semantic === 'TANGENT' && !required.has(semantic)) {
			unused.push(semantic);
		} else if (semantic.startsWith('TEXCOORD_') && !required.has(semantic)) {
			unused.push(semantic);
		} else if (semantic.startsWith('COLOR_') && semantic !== 'COLOR_0') {
			unused.push(semantic);
		}
	}
	return unused;
}

/**
 * Lists vertex attribute semantics required by a material. Does not include
 * attributes that would be used unconditionally, like POSITION or NORMAL.
 */
function listRequiredSemantics(
	document: Document,
	material: Material | ExtensionProperty | null,
	semantics = new Set<string>(),
): Set<string> {
	if (!material) return semantics;

	const graph = document.getGraph();

	const edges = graph.listChildEdges(material);
	const textureNames = new Set<string>();

	for (const edge of edges) {
		if (edge.getChild() instanceof Texture) {
			textureNames.add(edge.getName());
		}
	}

	for (const edge of edges) {
		const name = edge.getName();
		const child = edge.getChild();

		if (child instanceof TextureInfo) {
			if (textureNames.has(name.replace(/Info$/, ''))) {
				semantics.add(`TEXCOORD_${child.getTexCoord()}`);
			}
		}

		if (child instanceof Texture && name.match(/normalTexture/i)) {
			semantics.add('TANGENT');
		}

		if (child instanceof ExtensionProperty) {
			listRequiredSemantics(document, child, semantics);
		}

		// TODO(#748): Does KHR_materials_anisotropy imply required vertex attributes?
	}

	return semantics;
}

/**
 * Shifts texCoord indices on the given material and primitives assigned to
 * that material, such that indices start at zero and ascend without gaps.
 * Prior to calling this function, the implementation must ensure that:
 * - All TEXCOORD_n attributes on these prims are used by the material.
 * - Material does not require any unavailable TEXCOORD_n attributes.
 *
 * TEXCOORD_n attributes on morph targets are shifted alongside the parent
 * prim, but gaps may remain in their semantic lists.
 */
function shiftTexCoords(material: Material, prims: Primitive[]) {
	// Create map from srcTexCoord → dstTexCoord.
	const textureInfoList = listTextureInfoByMaterial(material);
	const texCoordSet = new Set(textureInfoList.map((info: TextureInfo) => info.getTexCoord()));
	const texCoordList = Array.from(texCoordSet).sort();
	const texCoordMap = new Map(texCoordList.map((texCoord, index) => [texCoord, index]));
	const semanticMap = new Map(texCoordList.map((texCoord, index) => [`TEXCOORD_${texCoord}`, `TEXCOORD_${index}`]));

	// Update material.
	for (const textureInfo of textureInfoList) {
		const texCoord = textureInfo.getTexCoord();
		textureInfo.setTexCoord(texCoordMap.get(texCoord)!);
	}

	// Update prims.
	for (const prim of prims) {
		const semantics = prim
			.listSemantics()
			.filter((semantic) => semantic.startsWith('TEXCOORD_'))
			.sort();
		updatePrim(prim, semantics);
		prim.listTargets().forEach((target) => updatePrim(target, semantics));
	}

	function updatePrim(prim: Primitive | PrimitiveTarget, srcSemantics: string[]) {
		for (const srcSemantic of srcSemantics) {
			const uv = prim.getAttribute(srcSemantic);
			if (!uv) continue;

			const dstSemantic = semanticMap.get(srcSemantic)!;
			if (dstSemantic === srcSemantic) continue;

			prim.setAttribute(dstSemantic, uv);
			prim.setAttribute(srcSemantic, null);
		}
	}
}

/**********************************************************************************************
 * Prune solid (single-color) textures.
 */

async function pruneSolidTextures(document: Document, counter: DisposeCounter): Promise<void> {
	const root = document.getRoot();
	const graph = document.getGraph();
	const logger = document.getLogger();
	const textures = root.listTextures();

	const pending = textures.map(async (texture) => {
		const factor = await getTextureFactor(texture);
		if (!factor) return;

		if (getTextureColorSpace(texture) === 'srgb') {
			ColorUtils.convertSRGBToLinear(factor, factor);
		}

		const name = texture.getName() || texture.getURI();
		const size = texture.getSize()?.join('x');
		const slots = listTextureSlots(texture);

		for (const edge of graph.listParentEdges(texture)) {
			const parent = edge.getParent();
			if (parent !== root && applyMaterialFactor(parent as Material, factor, edge.getName(), logger)) {
				edge.dispose();
			}
		}

		if (texture.listParents().length === 1) {
			counter.dispose(texture);
			logger.debug(`${NAME}: Removed solid-color texture "${name}" (${size}px ${slots.join(', ')})`);
		}
	});

	await Promise.all(pending);
}

function applyMaterialFactor(
	material: Material | ExtensionProperty,
	factor: vec4,
	slot: string,
	logger: ILogger,
): boolean {
	if (material instanceof Material) {
		switch (slot) {
			case 'baseColorTexture':
				material.setBaseColorFactor(mul(factor, factor, material.getBaseColorFactor()) as vec4);
				return true;
			case 'emissiveTexture':
				material.setEmissiveFactor(
					mulVec3([0, 0, 0], factor.slice(0, 3) as vec3, material.getEmissiveFactor()) as vec3,
				);
				return true;
			case 'occlusionTexture':
				return Math.abs(factor[0] - 1) <= EPS;
			case 'metallicRoughnessTexture':
				material.setRoughnessFactor(factor[1] * material.getRoughnessFactor());
				material.setMetallicFactor(factor[2] * material.getMetallicFactor());
				return true;
			case 'normalTexture':
				return len(sub(create(), factor, [0.5, 0.5, 1, 1])) <= EPS;
		}
	}

	logger.warn(`${NAME}: Detected single-color ${slot} texture. Pruning ${slot} not yet supported.`);
	return false;
}

async function getTextureFactor(texture: Texture): Promise<vec4 | null> {
	const pixels = await maybeGetPixels(texture);
	if (!pixels) return null;

	const min: vec4 = [Infinity, Infinity, Infinity, Infinity];
	const max: vec4 = [-Infinity, -Infinity, -Infinity, -Infinity];
	const target: vec4 = [0, 0, 0, 0];

	const [width, height] = pixels.shape;

	for (let i = 0; i < width; i++) {
		for (let j = 0; j < height; j++) {
			for (let k = 0; k < 4; k++) {
				min[k] = Math.min(min[k], pixels.get(i, j, k));
				max[k] = Math.max(max[k], pixels.get(i, j, k));
			}
		}

		if (len(sub(target, max, min)) / 255 > EPS) {
			return null;
		}
	}

	return scale(target, add(target, max, min), 0.5 / 255) as vec4;
}

async function maybeGetPixels(texture: Texture): Promise<NdArray<Uint8Array> | null> {
	try {
		return await getPixels(texture.getImage()!, texture.getMimeType());
	} catch (e) {
		return null;
	}
}
