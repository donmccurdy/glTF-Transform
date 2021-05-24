import { Format, GLB_BUFFER, NAME, PropertyType, VERSION, VertexLayout } from '../constants';
import { Document } from '../document';
import { Link } from '../graph';
import { JSONDocument } from '../json-document';
import { Accessor, AnimationSampler, AttributeLink, Camera, IndexLink, Material, Property } from '../properties';
import { GLTF } from '../types/gltf';
import { BufferUtils, Logger, MathUtils } from '../utils';
import { WriterContext } from './writer-context';

const BufferViewTarget = {
	ARRAY_BUFFER: 34962,
	ELEMENT_ARRAY_BUFFER: 34963
};

const BufferViewUsage = {
	ARRAY_BUFFER: 'ARRAY_BUFFER',
	ELEMENT_ARRAY_BUFFER: 'ELEMENT_ARRAY_BUFFER',
	INVERSE_BIND_MATRICES: 'INVERSE_BIND_MATRICES',
	OTHER: 'OTHER',
};

export interface WriterOptions {
	format: Format;
	logger?: Logger;
	basename?: string;
	vertexLayout?: VertexLayout,
	dependencies?: {[key: string]: unknown};
}

/** @internal */
export class GLTFWriter {
	public static write(doc: Document, options: Required<WriterOptions>): JSONDocument {

		const root = doc.getRoot();
		const jsonDoc = {json: {asset: root.getAsset()}, resources: {}} as JSONDocument;
		const json = jsonDoc.json;
		json.asset.generator = `glTF-Transform ${VERSION}`;

		const context = new WriterContext(doc, jsonDoc, options);
		const logger = options.logger || Logger.DEFAULT_INSTANCE;

		/* Extensions (1/2). */

		for (const extension of doc.getRoot().listExtensionsUsed()) {
			for (const key of extension.writeDependencies) {
				extension.install(key, options.dependencies[key]);
			}
		}

		/* Utilities. */

		interface BufferViewResult {
			byteLength: number;
			buffers: ArrayBuffer[];
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
				bufferViewTarget?: number): BufferViewResult {
			const buffers: ArrayBuffer[] = [];
			let byteLength = 0;

			// Create accessor definitions, determining size of final buffer view.
			for (const accessor of accessors) {
				const accessorDef = context.createAccessorDef(accessor);
				accessorDef.bufferView = json.bufferViews!.length;

				const data = BufferUtils.pad(accessor.getArray()!.buffer);
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

			return {buffers, byteLength};
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
				bufferByteOffset: number): BufferViewResult {
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
						const viewByteOffset =
							i * byteStride + vertexByteOffset + j * componentSize;
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
				target: BufferViewTarget.ARRAY_BUFFER,
			};
			json.bufferViews!.push(bufferViewDef);

			return {byteLength, buffers: [buffer]};
		}

		/* Data use pre-processing. */

		const accessorLinks = new Map<Accessor, Link<Property, Accessor>[]>();

		// Gather all accessors, creating a map to look up their uses.
		for (const link of doc.getGraph().getLinks()) {
			if (link.getParent() === root) continue;

			const child = link.getChild();

			if (child instanceof Accessor) {
				const uses = accessorLinks.get(child) || [];
				uses.push(link as Link<Property, Accessor>);
				accessorLinks.set(child, uses);
			}
		}

		json.accessors = [];
		json.bufferViews = [];

		/* Textures. */

		// glTF-Transform's "Texture" properties correspond 1:1 with glTF "Image" properties, and
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

		/* Buffers, buffer views, and accessors. */

		doc.getRoot().listExtensionsUsed()
			.filter((extension) => extension.prewriteTypes.includes(PropertyType.ACCESSOR))
			.forEach((extension) => extension.prewrite(context, PropertyType.ACCESSOR));

		json.buffers = [];
		root.listBuffers().forEach((buffer) => {
			const bufferDef = context.createPropertyDef(buffer) as GLTF.IBuffer;

			// Attributes are grouped and interleaved in one buffer view per mesh primitive.
			// Indices for all primitives are grouped into a single buffer view. IBMs are grouped
			// into a single buffer view. Other usage (if specified by extensions) also goes into
			// a dedicated buffer view. Everything else goes into a miscellaneous buffer view.

			// Certain accessor usage should group data into buffer views by the accessor parent.
			// The `accessorParents` map uses the first parent of each accessor for this purpose.
			const groupByParent = context.accessorUsageGroupedByParent;
			const accessorParents = new Map<Property, Set<Accessor>>();

			const bufferAccessors = buffer.listParents()
				.filter((property) => property instanceof Accessor) as Accessor[];
			const bufferAccessorsSet = new Set(bufferAccessors);

			// Categorize accessors by use.
			for (const accessor of bufferAccessors) {
				// Skip if already written by an extension.
				if (context.accessorIndexMap.has(accessor)) continue;

				// Assign usage for core accessor usage types (explicit targets and implicit usage).
				const accessorRefs = accessorLinks.get(accessor) || [];
				for (const link of accessorRefs) {
					if (context.getAccessorUsage(accessor)) break;

					if (link instanceof AttributeLink) {
						context.setAccessorUsage(accessor, BufferViewUsage.ARRAY_BUFFER);
					} else if (link instanceof IndexLink) {
						context.setAccessorUsage(accessor, BufferViewUsage.ELEMENT_ARRAY_BUFFER);
					} else if (link.getName() === 'inverseBindMatrices') {
						context.setAccessorUsage(accessor, BufferViewUsage.INVERSE_BIND_MATRICES);
					}
				}

				// Group accessors with no specified usage into a miscellaneous buffer view.
				if (!context.getAccessorUsage(accessor)) {
					context.setAccessorUsage(accessor, BufferViewUsage.OTHER);
				}

				// For accessor usage that requires grouping by parent (vertex and instance
				// attributes) organize buffer views accordingly.
				const usage = context.getAccessorUsage(accessor);
				if (usage && groupByParent.has(usage)) {
					const parent = accessorRefs[0].getParent();
					const parentAccessors = accessorParents.get(parent) || new Set<Accessor>();
					parentAccessors.add(accessor);
					accessorParents.set(parent, parentAccessors);
				}
			}

			// Write accessor groups to buffer views.

			const buffers: ArrayBuffer[] = [];
			const bufferIndex = json.buffers!.length;
			let bufferByteLength = 0;

			const usageGroups = context.listAccessorsByUsage();

			for (const usage in usageGroups) {
				if (groupByParent.has(usage)) {
					// Accessors grouped by (first) parent, including vertex and instance
					// attributes.
					for (const parentAccessors of Array.from(accessorParents.values())) {
						const accessors = Array.from(parentAccessors)
							.filter((a) => bufferAccessorsSet.has(a))
							.filter((a) => context.getAccessorUsage(a) === usage);
						if (!accessors.length) continue;

						if (usage !== BufferViewUsage.ARRAY_BUFFER
								|| options.vertexLayout === VertexLayout.INTERLEAVED) {
							// Case 1: Non-vertex data OR interleaved vertex data.

							// Instanced data is not interleaved, see:
							// https://github.com/KhronosGroup/glTF/pull/1888
							const result = usage === BufferViewUsage.ARRAY_BUFFER
								? interleaveAccessors(accessors, bufferIndex, bufferByteLength)
								: concatAccessors(accessors, bufferIndex, bufferByteLength);
							bufferByteLength += result.byteLength;
							buffers.push(...result.buffers);
						} else {
							// Case 2: Non-interleaved vertex data.

							for (const accessor of accessors) {
								// We 'interleave' a single accessor because the method pads to
								// 4-byte boundaries, which concatAccessors() does not.
								const result = interleaveAccessors(
									[accessor],
									bufferIndex,
									bufferByteLength,
								);
								bufferByteLength += result.byteLength;
								buffers.push(...result.buffers);
							}
						}
					}
				} else {
					// Accessors concatenated end-to-end, including indices, IBMs, and other data.
					const accessors = usageGroups[usage].filter((a) => bufferAccessorsSet.has(a));
					if (!accessors.length) continue;

					const target = usage === BufferViewUsage.ELEMENT_ARRAY_BUFFER
						? BufferViewTarget.ELEMENT_ARRAY_BUFFER
						: undefined;
					const result = concatAccessors(
						accessors, bufferIndex, bufferByteLength, target
					);
					bufferByteLength += result.byteLength;
					buffers.push(...result.buffers);
				}
			}

			// We only support embedded images in GLB, so we know there is only one buffer.
			if (context.imageBufferViews.length) {
				for (let i = 0; i < context.imageBufferViews.length; i++) {
					json.bufferViews![json.images![i].bufferView!].byteOffset = bufferByteLength;
					bufferByteLength += context.imageBufferViews[i].byteLength;
					buffers.push(context.imageBufferViews[i]);

					if (bufferByteLength % 4) {
						// See: https://github.com/KhronosGroup/glTF/issues/1935
						const imagePadding = 4 - (bufferByteLength % 4);
						bufferByteLength += imagePadding;
						buffers.push(new ArrayBuffer(imagePadding));
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

			if (!bufferByteLength) {
				context.logger.warn(`${NAME}: Skipping empty buffer, "${buffer.getName()}".`);
				return;
			}

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

			json.buffers!.push(bufferDef);
		});

		if (root.listAccessors().find((a) => !a.getBuffer())) {
			logger.warn('Skipped writing one or more Accessors: no Buffer assigned.');
		}

		/* Materials. */

		json.materials = root.listMaterials().map((material, index) => {
			const materialDef = context.createPropertyDef(material) as GLTF.IMaterial;

			// Program state & blending.

			materialDef.alphaMode = material.getAlphaMode();
			if (material.getAlphaMode() === Material.AlphaMode.MASK) {
				materialDef.alphaCutoff = material.getAlphaCutoff();
			}
			materialDef.doubleSided = material.getDoubleSided();

			// Factors.

			materialDef.pbrMetallicRoughness = {};
			materialDef.pbrMetallicRoughness.baseColorFactor = material.getBaseColorFactor();
			materialDef.emissiveFactor = material.getEmissiveFactor();
			materialDef.pbrMetallicRoughness.roughnessFactor = material.getRoughnessFactor();
			materialDef.pbrMetallicRoughness.metallicFactor = material.getMetallicFactor();

			// Textures.

			if (material.getBaseColorTexture()) {
				const texture = material.getBaseColorTexture()!;
				const textureInfo = material.getBaseColorTextureInfo()!;
				materialDef.pbrMetallicRoughness.baseColorTexture
					= context.createTextureInfoDef(texture, textureInfo);
			}

			if (material.getEmissiveTexture()) {
				const texture = material.getEmissiveTexture()!;
				const textureInfo = material.getEmissiveTextureInfo()!;
				materialDef.emissiveTexture = context.createTextureInfoDef(texture, textureInfo);
			}

			if (material.getNormalTexture()) {
				const texture = material.getNormalTexture()!;
				const textureInfo = material.getNormalTextureInfo()!;
				const textureInfoDef = context.createTextureInfoDef(texture, textureInfo) as
					GLTF.IMaterialNormalTextureInfo;
				if (material.getNormalScale() !== 1) {
					textureInfoDef.scale = material.getNormalScale();
				}
				materialDef.normalTexture = textureInfoDef;
			}

			if (material.getOcclusionTexture()) {
				const texture = material.getOcclusionTexture()!;
				const textureInfo = material.getOcclusionTextureInfo()!;
				const textureInfoDef = context.createTextureInfoDef(texture, textureInfo) as
					GLTF.IMaterialOcclusionTextureInfo;
				if (material.getOcclusionStrength() !== 1) {
					textureInfoDef.strength = material.getOcclusionStrength();
				}
				materialDef.occlusionTexture = textureInfoDef;
			}

			if (material.getMetallicRoughnessTexture()) {
				const texture = material.getMetallicRoughnessTexture()!;
				const textureInfo = material.getMetallicRoughnessTextureInfo()!;
				materialDef.pbrMetallicRoughness.metallicRoughnessTexture
					= context.createTextureInfoDef(texture, textureInfo);
			}

			context.materialIndexMap.set(material, index);
			return materialDef;
		});

		/* Meshes. */

		json.meshes = root.listMeshes().map((mesh, index) => {
			const meshDef = context.createPropertyDef(mesh) as GLTF.IMesh;

			let targetNames: string[] | null = null;

			meshDef.primitives = mesh.listPrimitives().map((primitive) => {
				const primitiveDef: GLTF.IMeshPrimitive = {attributes: {}};

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
					primitiveDef.attributes[semantic]
						= context.accessorIndexMap.get(primitive.getAttribute(semantic)!)!;
				}

				for (const target of primitive.listTargets()) {
					const targetDef = {} as {[name: string]: number};

					for (const semantic of target.listSemantics()) {
						targetDef[semantic]
							= context.accessorIndexMap.get(target.getAttribute(semantic)!)!;
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
				nodeDef.children = node.listChildren()
					.map((node) => context.nodeIndexMap.get(node)!);
			}
		});

		/** Animations. */

		json.animations = root.listAnimations().map((animation) => {
			const animationDef = context.createPropertyDef(animation) as GLTF.IAnimation;

			const samplerIndexMap: Map<AnimationSampler, number> = new Map();

			animationDef.samplers = animation.listSamplers()
				.map((sampler, samplerIndex) => {
					const samplerDef = context.createPropertyDef(sampler) as GLTF.IAnimationSampler;
					samplerDef.input = context.accessorIndexMap.get(sampler.getInput()!)!;
					samplerDef.output = context.accessorIndexMap.get(sampler.getOutput()!)!;
					samplerDef.interpolation = sampler.getInterpolation();
					samplerIndexMap.set(sampler, samplerIndex);
					return samplerDef;
				});

			animationDef.channels = animation.listChannels()
				.map((channel) => {
					const channelDef = context.createPropertyDef(channel) as GLTF.IAnimationChannel;
					channelDef.sampler = samplerIndexMap.get(channel.getSampler()!)!;
					channelDef.target = {
						node: context.nodeIndexMap.get(channel.getTargetNode()!)!,
						path: channel.getTargetPath()!,
					};
					return channelDef;
				});

			return animationDef;
		});

		/* Scenes. */

		json.scenes = root.listScenes().map((scene) => {
			const sceneDef = context.createPropertyDef(scene) as GLTF.IScene;
			sceneDef.nodes = scene.listChildren().map((node) => context.nodeIndexMap.get(node)!);
			return sceneDef;
		});

		const defaultScene = root.getDefaultScene();
		if (defaultScene) {
			json.scene = root.listScenes().indexOf(defaultScene);
		}

		/* Extensions (2/2). */

		json.extensionsUsed = root.listExtensionsUsed().map((ext) => ext.extensionName);
		json.extensionsRequired = root.listExtensionsRequired().map((ext) => ext.extensionName);
		root.listExtensionsUsed().forEach((extension) => extension.write(context));

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
		}
	}

	for (const key of unused) {
		delete object[key];
	}
}
