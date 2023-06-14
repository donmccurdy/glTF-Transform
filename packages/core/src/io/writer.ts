import {
	ComponentTypeToTypedArray,
	Format,
	GLB_BUFFER,
	PropertyType,
	TypedArray,
	VERSION,
	VertexLayout,
} from '../constants.js';
import type { Document } from '../document.js';
import type { Extension } from '../extension.js';
import type { GraphEdge } from 'property-graph';
import type { JSONDocument } from '../json-document.js';
import { Accessor, AnimationSampler, Camera, Material, Property } from '../properties/index.js';
import type { GLTF } from '../types/gltf.js';
import { BufferUtils, Logger, MathUtils } from '../utils/index.js';
import { WriterContext } from './writer-context.js';

const { BufferViewUsage } = WriterContext;
const { UNSIGNED_INT, UNSIGNED_SHORT, UNSIGNED_BYTE } = Accessor.ComponentType;

export interface WriterOptions {
	format: Format;
	logger?: Logger;
	basename?: string;
	vertexLayout?: VertexLayout;
	dependencies?: { [key: string]: unknown };
	extensions?: (typeof Extension)[];
}

/**
 * @internal
 * @hidden
 */
export class GLTFWriter {
	public static write(doc: Document, options: Required<WriterOptions>): JSONDocument {
		const root = doc.getRoot();
		const json = {
			asset: { generator: `glTF-Transform ${VERSION}`, ...root.getAsset() },
			extras: { ...root.getExtras() },
		} as GLTF.IGLTF;
		const jsonDoc = { json, resources: {} } as JSONDocument;

		const context = new WriterContext(doc, jsonDoc, options);
		const logger = options.logger || Logger.DEFAULT_INSTANCE;

		/* Extensions (1/2). */

		// Extensions present on the Document are not written unless they are also registered with
		// the I/O class. This ensures that setup in `extension.register()` is completed, and
		// allows a Document to be written with specific extensions disabled.
		const extensionsRegistered = new Set(options.extensions.map((ext) => ext.EXTENSION_NAME));
		const extensionsUsed = doc
			.getRoot()
			.listExtensionsUsed()
			.filter((ext) => extensionsRegistered.has(ext.extensionName));
		const extensionsRequired = doc
			.getRoot()
			.listExtensionsRequired()
			.filter((ext) => extensionsRegistered.has(ext.extensionName));

		if (extensionsUsed.length < doc.getRoot().listExtensionsUsed().length) {
			logger.warn('Some extensions were not registered for I/O, and will not be written.');
		}

		for (const extension of extensionsUsed) {
			for (const key of extension.writeDependencies) {
				extension.install(key, options.dependencies[key]);
			}
		}

		/* Utilities. */

		interface BufferViewResult {
			byteLength: number;
			buffers: Uint8Array[];
		}

		/**
		 * Pack a group of accessors into a sequential buffer view. Appends accessor and buffer view
		 * definitions to the root JSON lists.
		 *
		 * @param accessors Accessors to be included.
		 * @param bufferIndex Buffer to write to.
		 * @param bufferByteOffset Current offset into the buffer, accounting for other buffer views.
		 * @param bufferViewTarget (Optional) target use of the buffer view.
		 */
		function concatAccessors(
			accessors: Accessor[],
			bufferIndex: number,
			bufferByteOffset: number,
			bufferViewTarget?: number
		): BufferViewResult {
			const buffers: Uint8Array[] = [];
			let byteLength = 0;

			// Create accessor definitions, determining size of final buffer view.
			for (const accessor of accessors) {
				const accessorDef = context.createAccessorDef(accessor);
				accessorDef.bufferView = json.bufferViews!.length;

				const accessorArray = accessor.getArray()!;
				const data = BufferUtils.pad(BufferUtils.toView(accessorArray));
				accessorDef.byteOffset = byteLength;
				byteLength += data.byteLength;
				buffers.push(data);

				context.accessorIndexMap.set(accessor, json.accessors!.length);
				json.accessors!.push(accessorDef);
			}

			// Create buffer view definition.
			const bufferViewData = BufferUtils.concat(buffers);
			const bufferViewDef: GLTF.IBufferView = {
				buffer: bufferIndex,
				byteOffset: bufferByteOffset,
				byteLength: bufferViewData.byteLength,
			};
			if (bufferViewTarget) bufferViewDef.target = bufferViewTarget;
			json.bufferViews!.push(bufferViewDef);

			return { buffers, byteLength };
		}

		/**
		 * Pack a group of accessors into an interleaved buffer view. Appends accessor and buffer
		 * view definitions to the root JSON lists. Buffer view target is implicitly attribute data.
		 *
		 * References:
		 * - [Apple • Best Practices for Working with Vertex Data](https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html)
		 * - [Khronos • Vertex Specification Best Practices](https://www.khronos.org/opengl/wiki/Vertex_Specification_Best_Practices)
		 *
		 * @param accessors Accessors to be included.
		 * @param bufferIndex Buffer to write to.
		 * @param bufferByteOffset Offset into the buffer, accounting for other buffer views.
		 */
		function interleaveAccessors(
			accessors: Accessor[],
			bufferIndex: number,
			bufferByteOffset: number
		): BufferViewResult {
			const vertexCount = accessors[0].getCount();
			let byteStride = 0;

			// Create accessor definitions, determining size and stride of final buffer view.
			for (const accessor of accessors) {
				const accessorDef = context.createAccessorDef(accessor);
				accessorDef.bufferView = json.bufferViews!.length;
				accessorDef.byteOffset = byteStride;

				const elementSize = accessor.getElementSize();
				const componentSize = accessor.getComponentSize();
				byteStride += BufferUtils.padNumber(elementSize * componentSize);

				context.accessorIndexMap.set(accessor, json.accessors!.length);
				json.accessors!.push(accessorDef);
			}

			// Allocate interleaved buffer view.
			const byteLength = vertexCount * byteStride;
			const buffer = new ArrayBuffer(byteLength);
			const view = new DataView(buffer);

			// Write interleaved accessor data to the buffer view.
			for (let i = 0; i < vertexCount; i++) {
				let vertexByteOffset = 0;
				for (const accessor of accessors) {
					const elementSize = accessor.getElementSize();
					const componentSize = accessor.getComponentSize();
					const componentType = accessor.getComponentType();
					const array = accessor.getArray()!;
					for (let j = 0; j < elementSize; j++) {
						const viewByteOffset = i * byteStride + vertexByteOffset + j * componentSize;
						const value = array[i * elementSize + j];
						switch (componentType) {
							case Accessor.ComponentType.FLOAT:
								view.setFloat32(viewByteOffset, value, true);
								break;
							case Accessor.ComponentType.BYTE:
								view.setInt8(viewByteOffset, value);
								break;
							case Accessor.ComponentType.SHORT:
								view.setInt16(viewByteOffset, value, true);
								break;
							case Accessor.ComponentType.UNSIGNED_BYTE:
								view.setUint8(viewByteOffset, value);
								break;
							case Accessor.ComponentType.UNSIGNED_SHORT:
								view.setUint16(viewByteOffset, value, true);
								break;
							case Accessor.ComponentType.UNSIGNED_INT:
								view.setUint32(viewByteOffset, value, true);
								break;
							default:
								throw new Error('Unexpected component type: ' + componentType);
						}
					}
					vertexByteOffset += BufferUtils.padNumber(elementSize * componentSize);
				}
			}

			// Create buffer view definition.
			const bufferViewDef: GLTF.IBufferView = {
				buffer: bufferIndex,
				byteOffset: bufferByteOffset,
				byteLength: byteLength,
				byteStride: byteStride,
				target: WriterContext.BufferViewTarget.ARRAY_BUFFER,
			};
			json.bufferViews!.push(bufferViewDef);

			return { byteLength, buffers: [new Uint8Array(buffer)] };
		}

		/**
		 * Pack a group of sparse accessors. Appends accessor and buffer view
		 * definitions to the root JSON lists.
		 *
		 * @param accessors Accessors to be included.
		 * @param bufferIndex Buffer to write to.
		 * @param bufferByteOffset Current offset into the buffer, accounting for other buffer views.
		 */
		function concatSparseAccessors(
			accessors: Accessor[],
			bufferIndex: number,
			bufferByteOffset: number
		): BufferViewResult {
			const buffers: Uint8Array[] = [];
			let byteLength = 0;

			interface SparseData {
				accessorDef: GLTF.IAccessor;
				count: number;
				indices?: number[];
				values?: TypedArray;
				indicesByteOffset?: number;
				valuesByteOffset?: number;
			}
			const sparseData = new Map<Accessor, SparseData>();
			let maxIndex = -Infinity;

			// (1) Write accessor definitions, gathering indices and values.

			for (const accessor of accessors) {
				const accessorDef = context.createAccessorDef(accessor);
				json.accessors!.push(accessorDef);
				context.accessorIndexMap.set(accessor, json.accessors!.length - 1);

				const indices = [];
				const values = [];

				const el = [] as number[];
				const base = new Array(accessor.getElementSize()).fill(0);

				for (let i = 0, il = accessor.getCount(); i < il; i++) {
					accessor.getElement(i, el);
					if (MathUtils.eq(el, base, 0)) continue;

					maxIndex = Math.max(i, maxIndex);
					indices.push(i);
					for (let j = 0; j < el.length; j++) values.push(el[j]);
				}

				const count = indices.length;
				const data: SparseData = { accessorDef, count };
				sparseData.set(accessor, data);

				if (count === 0) continue;

				if (count > accessor.getCount() / 3) {
					// Too late to write non-sparse values in the proper buffer views here.
					const pct = ((100 * indices.length) / accessor.getCount()).toFixed(1);
					logger.warn(`Sparse accessor with many non-zero elements (${pct}%) may increase file size.`);
				}

				const ValueArray = ComponentTypeToTypedArray[accessor.getComponentType()];
				data.indices = indices;
				data.values = new ValueArray(values);
			}

			// (2) Early exit if all sparse accessors are just zero-filled arrays.

			if (!Number.isFinite(maxIndex)) {
				return { buffers, byteLength };
			}

			// (3) Write index buffer view.

			const IndexArray = maxIndex < 255 ? Uint8Array : maxIndex < 65535 ? Uint16Array : Uint32Array;
			const IndexComponentType =
				maxIndex < 255 ? UNSIGNED_BYTE : maxIndex < 65535 ? UNSIGNED_SHORT : UNSIGNED_INT;

			const indicesBufferViewDef: GLTF.IBufferView = {
				buffer: bufferIndex,
				byteOffset: bufferByteOffset + byteLength,
				byteLength: 0,
			};
			for (const accessor of accessors) {
				const data = sparseData.get(accessor)!;
				if (data.count === 0) continue;

				data.indicesByteOffset = indicesBufferViewDef.byteLength;

				const buffer = BufferUtils.pad(BufferUtils.toView(new IndexArray(data.indices!)));
				buffers.push(buffer);
				byteLength += buffer.byteLength;
				indicesBufferViewDef.byteLength += buffer.byteLength;
			}
			json.bufferViews!.push(indicesBufferViewDef);
			const indicesBufferViewIndex = json.bufferViews!.length - 1;

			// (4) Write value buffer view.

			const valuesBufferViewDef: GLTF.IBufferView = {
				buffer: bufferIndex,
				byteOffset: bufferByteOffset + byteLength,
				byteLength: 0,
			};
			for (const accessor of accessors) {
				const data = sparseData.get(accessor)!;
				if (data.count === 0) continue;

				data.valuesByteOffset = valuesBufferViewDef.byteLength;

				const buffer = BufferUtils.pad(BufferUtils.toView(data.values!));
				buffers.push(buffer);
				byteLength += buffer.byteLength;
				valuesBufferViewDef.byteLength += buffer.byteLength;
			}
			json.bufferViews!.push(valuesBufferViewDef);
			const valuesBufferViewIndex = json.bufferViews!.length - 1;

			// (5) Write accessor sparse entries.

			for (const accessor of accessors) {
				const data = sparseData.get(accessor) as Required<SparseData>;
				if (data.count === 0) continue;

				data.accessorDef.sparse = {
					count: data.count,
					indices: {
						bufferView: indicesBufferViewIndex,
						byteOffset: data.indicesByteOffset,
						componentType: IndexComponentType,
					},
					values: {
						bufferView: valuesBufferViewIndex,
						byteOffset: data.valuesByteOffset,
					},
				};
			}

			return { buffers, byteLength };
		}

		/* Data use pre-processing. */

		const accessorRefs = new Map<Accessor, GraphEdge<Property, Accessor>[]>();

		// Gather all accessors, creating a map to look up their uses.
		for (const ref of doc.getGraph().listEdges()) {
			if (ref.getParent() === root) continue;

			const child = ref.getChild();

			if (child instanceof Accessor) {
				const uses = accessorRefs.get(child) || [];
				uses.push(ref as GraphEdge<Property, Accessor>);
				accessorRefs.set(child, uses);
			}
		}

		json.accessors = [];
		json.bufferViews = [];

		/* Textures. */

		// glTF Transform's "Texture" properties correspond 1:1 with glTF "Image" properties, and
		// with image files. The glTF file may contain more one texture per image, where images
		// are reused with different sampler properties.
		json.samplers = [];
		json.textures = [];
		json.images = root.listTextures().map((texture, textureIndex) => {
			const imageDef = context.createPropertyDef(texture) as GLTF.IImage;

			if (texture.getMimeType()) {
				imageDef.mimeType = texture.getMimeType();
			}

			const image = texture.getImage();
			if (image) {
				context.createImageData(imageDef, image, texture);
			}

			context.imageIndexMap.set(texture, textureIndex);
			return imageDef;
		});

		/* Accessors. */

		extensionsUsed
			.filter((extension) => extension.prewriteTypes.includes(PropertyType.ACCESSOR))
			.forEach((extension) => extension.prewrite(context, PropertyType.ACCESSOR));
		root.listAccessors().forEach((accessor) => {
			// Attributes are grouped and interleaved in one buffer view per mesh primitive.
			// Indices for all primitives are grouped into a single buffer view. IBMs are grouped
			// into a single buffer view. Other usage (if specified by extensions) also goes into
			// a dedicated buffer view. Everything else goes into a miscellaneous buffer view.

			// Certain accessor usage should group data into buffer views by the accessor parent.
			// The `accessorParents` map uses the first parent of each accessor for this purpose.
			const groupByParent = context.accessorUsageGroupedByParent;
			const accessorParents = context.accessorParents;

			// Skip if already written by an extension.
			if (context.accessorIndexMap.has(accessor)) return;

			// Assign usage for core accessor usage types (explicit targets and implicit usage).
			const accessorEdges = accessorRefs.get(accessor) || [];
			const usage = context.getAccessorUsage(accessor);
			context.addAccessorToUsageGroup(accessor, usage);

			// For accessor usage that requires grouping by parent (vertex and instance
			// attributes) organize buffer views accordingly.
			if (groupByParent.has(usage)) {
				const parent = accessorEdges[0].getParent();
				const parentAccessors = accessorParents.get(parent) || new Set<Accessor>();
				parentAccessors.add(accessor);
				accessorParents.set(parent, parentAccessors);
			}
		});

		/* Buffers, buffer views. */

		extensionsUsed
			.filter((extension) => extension.prewriteTypes.includes(PropertyType.BUFFER))
			.forEach((extension) => extension.prewrite(context, PropertyType.BUFFER));

		const hasBinaryResources =
			root.listAccessors().length > 0 || root.listTextures().length > 0 || context.otherBufferViews.size > 0;
		if (hasBinaryResources && root.listBuffers().length === 0) {
			throw new Error('Buffer required for Document resources, but none was found.');
		}

		json.buffers = [];
		root.listBuffers().forEach((buffer, index) => {
			const bufferDef = context.createPropertyDef(buffer) as GLTF.IBuffer;
			const groupByParent = context.accessorUsageGroupedByParent;
			const accessorParents = context.accessorParents;

			const bufferAccessors = buffer
				.listParents()
				.filter((property) => property instanceof Accessor) as Accessor[];
			const bufferAccessorsSet = new Set(bufferAccessors);

			// Write accessor groups to buffer views.

			const buffers: Uint8Array[] = [];
			const bufferIndex = json.buffers!.length;
			let bufferByteLength = 0;

			const usageGroups = context.listAccessorUsageGroups();

			for (const usage in usageGroups) {
				if (groupByParent.has(usage)) {
					// Accessors grouped by (first) parent, including vertex and instance attributes.
					for (const parentAccessors of Array.from(accessorParents.values())) {
						const accessors = Array.from(parentAccessors)
							.filter((a) => bufferAccessorsSet.has(a))
							.filter((a) => context.getAccessorUsage(a) === usage);
						if (!accessors.length) continue;

						if (
							usage !== BufferViewUsage.ARRAY_BUFFER ||
							options.vertexLayout === VertexLayout.INTERLEAVED
						) {
							// Case 1: Non-vertex data OR interleaved vertex data.

							// Instanced data is not interleaved, see:
							// https://github.com/KhronosGroup/glTF/pull/1888
							const result =
								usage === BufferViewUsage.ARRAY_BUFFER
									? interleaveAccessors(accessors, bufferIndex, bufferByteLength)
									: concatAccessors(accessors, bufferIndex, bufferByteLength);
							bufferByteLength += result.byteLength;
							buffers.push(...result.buffers);
						} else {
							// Case 2: Non-interleaved vertex data.

							for (const accessor of accessors) {
								// We 'interleave' a single accessor because the method pads to
								// 4-byte boundaries, which concatAccessors() does not.
								const result = interleaveAccessors([accessor], bufferIndex, bufferByteLength);
								bufferByteLength += result.byteLength;
								buffers.push(...result.buffers);
							}
						}
					}
				} else {
					// Accessors concatenated end-to-end, including indices, IBMs, and other data.
					const accessors = usageGroups[usage].filter((a) => bufferAccessorsSet.has(a));
					if (!accessors.length) continue;

					const target =
						usage === BufferViewUsage.ELEMENT_ARRAY_BUFFER
							? WriterContext.BufferViewTarget.ELEMENT_ARRAY_BUFFER
							: undefined;
					const result =
						usage === BufferViewUsage.SPARSE
							? concatSparseAccessors(accessors, bufferIndex, bufferByteLength)
							: concatAccessors(accessors, bufferIndex, bufferByteLength, target);
					bufferByteLength += result.byteLength;
					buffers.push(...result.buffers);
				}
			}

			// We only support embedded images in GLB, where the embedded buffer must be the first.
			// Additional buffers are currently left empty (see EXT_meshopt_compression fallback).
			if (context.imageBufferViews.length && index === 0) {
				for (let i = 0; i < context.imageBufferViews.length; i++) {
					json.bufferViews![json.images![i].bufferView!].byteOffset = bufferByteLength;
					bufferByteLength += context.imageBufferViews[i].byteLength;
					buffers.push(context.imageBufferViews[i]);

					if (bufferByteLength % 8) {
						// See: https://github.com/KhronosGroup/glTF/issues/1935
						const imagePadding = 8 - (bufferByteLength % 8);
						bufferByteLength += imagePadding;
						buffers.push(new Uint8Array(imagePadding));
					}
				}
			}

			if (context.otherBufferViews.has(buffer)) {
				for (const data of context.otherBufferViews.get(buffer)!) {
					json.bufferViews!.push({
						buffer: bufferIndex,
						byteOffset: bufferByteLength,
						byteLength: data.byteLength,
					});
					context.otherBufferViewsIndexMap.set(data, json.bufferViews!.length - 1);
					bufferByteLength += data.byteLength;
					buffers.push(data);
				}
			}

			if (bufferByteLength) {
				// Assign buffer URI.
				let uri: string;
				if (options.format === Format.GLB) {
					uri = GLB_BUFFER;
				} else {
					uri = context.bufferURIGenerator.createURI(buffer, 'bin');
					bufferDef.uri = uri;
				}

				// Write buffer views to buffer.
				bufferDef.byteLength = bufferByteLength;
				jsonDoc.resources[uri] = BufferUtils.concat(buffers);
			}

			json.buffers!.push(bufferDef);
			context.bufferIndexMap.set(buffer, index);
		});

		if (root.listAccessors().find((a) => !a.getBuffer())) {
			logger.warn('Skipped writing one or more Accessors: no Buffer assigned.');
		}

		/* Materials. */

		json.materials = root.listMaterials().map((material, index) => {
			const materialDef = context.createPropertyDef(material) as GLTF.IMaterial;

			// Program state & blending.

			if (material.getAlphaMode() !== Material.AlphaMode.OPAQUE) {
				materialDef.alphaMode = material.getAlphaMode();
			}
			if (material.getAlphaMode() === Material.AlphaMode.MASK) {
				materialDef.alphaCutoff = material.getAlphaCutoff();
			}
			if (material.getDoubleSided()) materialDef.doubleSided = true;

			// Factors.

			materialDef.pbrMetallicRoughness = {};
			if (!MathUtils.eq(material.getBaseColorFactor(), [1, 1, 1, 1])) {
				materialDef.pbrMetallicRoughness.baseColorFactor = material.getBaseColorFactor();
			}
			if (!MathUtils.eq(material.getEmissiveFactor(), [0, 0, 0])) {
				materialDef.emissiveFactor = material.getEmissiveFactor();
			}
			if (material.getRoughnessFactor() !== 1) {
				materialDef.pbrMetallicRoughness.roughnessFactor = material.getRoughnessFactor();
			}
			if (material.getMetallicFactor() !== 1) {
				materialDef.pbrMetallicRoughness.metallicFactor = material.getMetallicFactor();
			}

			// Textures.

			if (material.getBaseColorTexture()) {
				const texture = material.getBaseColorTexture()!;
				const textureInfo = material.getBaseColorTextureInfo()!;
				materialDef.pbrMetallicRoughness.baseColorTexture = context.createTextureInfoDef(texture, textureInfo);
			}

			if (material.getEmissiveTexture()) {
				const texture = material.getEmissiveTexture()!;
				const textureInfo = material.getEmissiveTextureInfo()!;
				materialDef.emissiveTexture = context.createTextureInfoDef(texture, textureInfo);
			}

			if (material.getNormalTexture()) {
				const texture = material.getNormalTexture()!;
				const textureInfo = material.getNormalTextureInfo()!;
				const textureInfoDef = context.createTextureInfoDef(
					texture,
					textureInfo
				) as GLTF.IMaterialNormalTextureInfo;
				if (material.getNormalScale() !== 1) {
					textureInfoDef.scale = material.getNormalScale();
				}
				materialDef.normalTexture = textureInfoDef;
			}

			if (material.getOcclusionTexture()) {
				const texture = material.getOcclusionTexture()!;
				const textureInfo = material.getOcclusionTextureInfo()!;
				const textureInfoDef = context.createTextureInfoDef(
					texture,
					textureInfo
				) as GLTF.IMaterialOcclusionTextureInfo;
				if (material.getOcclusionStrength() !== 1) {
					textureInfoDef.strength = material.getOcclusionStrength();
				}
				materialDef.occlusionTexture = textureInfoDef;
			}

			if (material.getMetallicRoughnessTexture()) {
				const texture = material.getMetallicRoughnessTexture()!;
				const textureInfo = material.getMetallicRoughnessTextureInfo()!;
				materialDef.pbrMetallicRoughness.metallicRoughnessTexture = context.createTextureInfoDef(
					texture,
					textureInfo
				);
			}

			context.materialIndexMap.set(material, index);
			return materialDef;
		});

		/* Meshes. */

		json.meshes = root.listMeshes().map((mesh, index) => {
			const meshDef = context.createPropertyDef(mesh) as GLTF.IMesh;

			let targetNames: string[] | null = null;

			meshDef.primitives = mesh.listPrimitives().map((primitive) => {
				const primitiveDef: GLTF.IMeshPrimitive = { attributes: {} };

				primitiveDef.mode = primitive.getMode();

				const material = primitive.getMaterial();
				if (material) {
					primitiveDef.material = context.materialIndexMap.get(material);
				}

				if (Object.keys(primitive.getExtras()).length) {
					primitiveDef.extras = primitive.getExtras();
				}

				const indices = primitive.getIndices();
				if (indices) {
					primitiveDef.indices = context.accessorIndexMap.get(indices);
				}

				for (const semantic of primitive.listSemantics()) {
					primitiveDef.attributes[semantic] = context.accessorIndexMap.get(
						primitive.getAttribute(semantic)!
					)!;
				}

				for (const target of primitive.listTargets()) {
					const targetDef = {} as { [name: string]: number };

					for (const semantic of target.listSemantics()) {
						targetDef[semantic] = context.accessorIndexMap.get(target.getAttribute(semantic)!)!;
					}

					primitiveDef.targets = primitiveDef.targets || [];
					primitiveDef.targets.push(targetDef);
				}

				if (primitive.listTargets().length && !targetNames) {
					targetNames = primitive.listTargets().map((target) => target.getName());
				}

				return primitiveDef;
			});

			if (mesh.getWeights().length) {
				meshDef.weights = mesh.getWeights();
			}

			if (targetNames) {
				meshDef.extras = meshDef.extras || {};
				meshDef.extras['targetNames'] = targetNames;
			}

			context.meshIndexMap.set(mesh, index);
			return meshDef;
		});

		/** Cameras. */

		json.cameras = root.listCameras().map((camera, index) => {
			const cameraDef = context.createPropertyDef(camera) as GLTF.ICamera;
			cameraDef.type = camera.getType();
			if (cameraDef.type === Camera.Type.PERSPECTIVE) {
				cameraDef.perspective = {
					znear: camera.getZNear(),
					zfar: camera.getZFar(),
					yfov: camera.getYFov(),
				};
				const aspectRatio = camera.getAspectRatio();
				if (aspectRatio !== null) {
					cameraDef.perspective.aspectRatio = aspectRatio;
				}
			} else {
				cameraDef.orthographic = {
					znear: camera.getZNear(),
					zfar: camera.getZFar(),
					xmag: camera.getXMag(),
					ymag: camera.getYMag(),
				};
			}

			context.cameraIndexMap.set(camera, index);
			return cameraDef;
		});

		/* Nodes. */

		json.nodes = root.listNodes().map((node, index) => {
			const nodeDef = context.createPropertyDef(node) as GLTF.INode;

			if (!MathUtils.eq(node.getTranslation(), [0, 0, 0])) {
				nodeDef.translation = node.getTranslation();
			}

			if (!MathUtils.eq(node.getRotation(), [0, 0, 0, 1])) {
				nodeDef.rotation = node.getRotation();
			}

			if (!MathUtils.eq(node.getScale(), [1, 1, 1])) {
				nodeDef.scale = node.getScale();
			}

			if (node.getWeights().length) {
				nodeDef.weights = node.getWeights();
			}

			// Attachments (mesh, camera, skin) defined later in writing process.

			context.nodeIndexMap.set(node, index);
			return nodeDef;
		});

		/** Skins. */

		json.skins = root.listSkins().map((skin, index) => {
			const skinDef = context.createPropertyDef(skin) as GLTF.ISkin;

			const inverseBindMatrices = skin.getInverseBindMatrices();
			if (inverseBindMatrices) {
				skinDef.inverseBindMatrices = context.accessorIndexMap.get(inverseBindMatrices);
			}

			const skeleton = skin.getSkeleton();
			if (skeleton) {
				skinDef.skeleton = context.nodeIndexMap.get(skeleton);
			}

			skinDef.joints = skin.listJoints().map((joint) => context.nodeIndexMap.get(joint)!);

			context.skinIndexMap.set(skin, index);
			return skinDef;
		});

		/** Node attachments. */

		root.listNodes().forEach((node, index) => {
			const nodeDef = json.nodes![index];

			const mesh = node.getMesh();
			if (mesh) {
				nodeDef.mesh = context.meshIndexMap.get(mesh);
			}

			const camera = node.getCamera();
			if (camera) {
				nodeDef.camera = context.cameraIndexMap.get(camera);
			}

			const skin = node.getSkin();
			if (skin) {
				nodeDef.skin = context.skinIndexMap.get(skin);
			}

			if (node.listChildren().length > 0) {
				nodeDef.children = node.listChildren().map((node) => context.nodeIndexMap.get(node)!);
			}
		});

		/** Animations. */

		json.animations = root.listAnimations().map((animation, index) => {
			const animationDef = context.createPropertyDef(animation) as GLTF.IAnimation;

			const samplerIndexMap: Map<AnimationSampler, number> = new Map();

			animationDef.samplers = animation.listSamplers().map((sampler, samplerIndex) => {
				const samplerDef = context.createPropertyDef(sampler) as GLTF.IAnimationSampler;
				samplerDef.input = context.accessorIndexMap.get(sampler.getInput()!)!;
				samplerDef.output = context.accessorIndexMap.get(sampler.getOutput()!)!;
				samplerDef.interpolation = sampler.getInterpolation();
				samplerIndexMap.set(sampler, samplerIndex);
				return samplerDef;
			});

			animationDef.channels = animation.listChannels().map((channel) => {
				const channelDef = context.createPropertyDef(channel) as GLTF.IAnimationChannel;
				channelDef.sampler = samplerIndexMap.get(channel.getSampler()!)!;
				channelDef.target = {
					node: context.nodeIndexMap.get(channel.getTargetNode()!)!,
					path: channel.getTargetPath()!,
				};
				return channelDef;
			});

			context.animationIndexMap.set(animation, index);
			return animationDef;
		});

		/* Scenes. */

		json.scenes = root.listScenes().map((scene, index) => {
			const sceneDef = context.createPropertyDef(scene) as GLTF.IScene;
			sceneDef.nodes = scene.listChildren().map((node) => context.nodeIndexMap.get(node)!);
			context.sceneIndexMap.set(scene, index);
			return sceneDef;
		});

		const defaultScene = root.getDefaultScene();
		if (defaultScene) {
			json.scene = root.listScenes().indexOf(defaultScene);
		}

		/* Extensions (2/2). */

		json.extensionsUsed = extensionsUsed.map((ext) => ext.extensionName);
		json.extensionsRequired = extensionsRequired.map((ext) => ext.extensionName);
		extensionsUsed.forEach((extension) => extension.write(context));

		//

		clean(json as unknown as Record<string, unknown>);

		return jsonDoc;
	}
}

/**
 * Removes empty and null values from an object.
 * @param object
 * @internal
 */
function clean(object: Record<string, unknown>): void {
	const unused: string[] = [];

	for (const key in object) {
		const value = object[key];
		if (Array.isArray(value) && value.length === 0) {
			unused.push(key);
		} else if (value === null || value === '') {
			unused.push(key);
		} else if (value && typeof value === 'object' && Object.keys(value).length === 0) {
			unused.push(key);
		}
	}

	for (const key of unused) {
		delete object[key];
	}
}
