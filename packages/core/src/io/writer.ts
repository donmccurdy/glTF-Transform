import { GLB_BUFFER, NAME, PropertyType, VERSION } from '../constants';
import { Document } from '../document';
import { Link } from '../graph';
import { JSONDocument } from '../json-document';
import { Accessor, AnimationSampler, AttributeLink, IndexLink, Primitive, Property, Root } from '../properties';
import { GLTF } from '../types/gltf';
import { BufferUtils, Logger } from '../utils';
import { UniqueURIGenerator, WriterContext } from './writer-context';

const BufferViewTarget = {
	ARRAY_BUFFER: 34962,
	ELEMENT_ARRAY_BUFFER: 34963
};

export interface WriterOptions {
	logger?: Logger;
	basename?: string;
	isGLB?: boolean;
	dependencies?: {[key: string]: unknown};
}

const DEFAULT_OPTIONS: WriterOptions = {
	logger: Logger.DEFAULT_INSTANCE,
	basename: '',
	isGLB: true,
	dependencies: {},
};

/** @hidden */
export class GLTFWriter {
	public static write(doc: Document, options: WriterOptions = DEFAULT_OPTIONS): JSONDocument {
		const root = doc.getRoot();
		const jsonDoc = {json: {asset: root.getAsset()}, resources: {}} as JSONDocument;
		const logger = options.logger || Logger.DEFAULT_INSTANCE;
		const json = jsonDoc.json;
		json.asset.generator = `glTF-Transform ${VERSION}`;

		/* Writer context. */

		const context = new WriterContext(jsonDoc, options);
		const numBuffers = root.listBuffers().length;
		const numImages = root.listTextures().length;
		context.bufferURIGenerator = new UniqueURIGenerator(numBuffers > 1, options.basename);
		context.imageURIGenerator = new UniqueURIGenerator(numImages > 1, options.basename);
		context.logger = doc.getLogger();

		/* Extensions (1/2). */

		for (const extension of doc.getRoot().listExtensionsUsed()) {
			for (const key of extension.dependencies) {
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
		function concatAccessors(accessors: Accessor[], bufferIndex: number, bufferByteOffset: number, bufferViewTarget?: number): BufferViewResult {
			const buffers: ArrayBuffer[] = [];
			let byteLength = 0;

			// Create accessor definitions, determining size of final buffer view.
			for (const accessor of accessors) {
				const accessorDef = context.createAccessorDef(accessor);
				accessorDef.bufferView = json.bufferViews.length;

				const data = BufferUtils.pad(accessor.getArray().buffer);
				accessorDef.byteOffset = byteLength;
				byteLength += data.byteLength;
				buffers.push(data);

				context.accessorIndexMap.set(accessor, json.accessors.length);
				json.accessors.push(accessorDef);
			}

			// Create buffer view definition.
			const bufferViewData = BufferUtils.concat(buffers);
			const bufferViewDef: GLTF.IBufferView = {
				buffer: bufferIndex,
				byteOffset: bufferByteOffset,
				byteLength: bufferViewData.byteLength,
			};
			if (bufferViewTarget) bufferViewDef.target = bufferViewTarget;
			json.bufferViews.push(bufferViewDef);

			return {buffers, byteLength}
		}

		/**
		* Pack a group of accessors into an interleaved buffer view. Appends accessor and buffer view
		* definitions to the root JSON lists. Buffer view target is implicitly attribute data.
		*
		* References:
		* - [Apple • Best Practices for Working with Vertex Data](https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html)
		* - [Khronos • Vertex Specification Best Practices](https://www.khronos.org/opengl/wiki/Vertex_Specification_Best_Practices)
		*
		* @param accessors Accessors to be included.
		* @param bufferIndex Buffer to write to.
		* @param bufferByteOffset Current offset into the buffer, accounting for other buffer views.
		*/
		function interleaveAccessors(accessors: Accessor[], bufferIndex: number, bufferByteOffset: number): BufferViewResult {
			const vertexCount = accessors[0].getCount();
			let byteStride = 0;

			// Create accessor definitions, determining size and stride of final buffer view.
			for (const accessor of accessors) {
				const accessorDef = context.createAccessorDef(accessor);
				accessorDef.bufferView = json.bufferViews.length;
				accessorDef.byteOffset = byteStride;

				const elementSize = accessor.getElementSize();
				const componentSize = accessor.getComponentSize();
				byteStride += BufferUtils.padNumber(elementSize * componentSize);

				context.accessorIndexMap.set(accessor, json.accessors.length);
				json.accessors.push(accessorDef);
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
					const array = accessor.getArray();
					for (let j = 0; j < elementSize; j++) {
						const viewByteOffset = i * byteStride + vertexByteOffset + j * componentSize;
						const value = array[i * elementSize + j];
						switch (componentType) {
							case GLTF.AccessorComponentType.FLOAT:
								view.setFloat32(viewByteOffset, value, true);
								break;
							case GLTF.AccessorComponentType.BYTE:
								view.setInt8(viewByteOffset, value);
								break;
							case GLTF.AccessorComponentType.SHORT:
								view.setInt16(viewByteOffset, value, true);
								break;
							case GLTF.AccessorComponentType.UNSIGNED_BYTE:
								view.setUint8(viewByteOffset, value);
								break;
							case GLTF.AccessorComponentType.UNSIGNED_SHORT:
								view.setUint16(viewByteOffset, value, true);
								break;
							case GLTF.AccessorComponentType.UNSIGNED_INT:
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
			json.bufferViews.push(bufferViewDef);

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

			if (texture.getImage()) {
				context.createImageData(imageDef, texture.getImage(), texture);
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

			// Attributes are grouped and interleaved in one buffer view per mesh primitive. Indices for
			// all primitives are grouped into a single buffer view. Everything else goes into a
			// miscellaneous buffer view.
			const attributeAccessors = new Map<Primitive, Set<Accessor>>();
			const indexAccessors = new Set<Accessor>();
			const ibmAccessors = new Set<Accessor>();
			const otherAccessors = new Set<Accessor>();

			const bufferParents = buffer.listParents()
				.filter((property) => !(property instanceof Root)) as Property[];

			// Categorize accessors by use.
			for (const parent of bufferParents) {
				if ((!(parent instanceof Accessor))) { // Not expected.
					throw new Error('Unimplemented buffer reference: ' + parent);
				}

				// Skip if already written by an extension.
				if (context.accessorIndexMap.has(parent)) continue;

				let isAttribute = false;
				let isIndex = false;
				let isIBM = false;
				let isOther = false;

				const accessorRefs = accessorLinks.get(parent) || [];

				for (const link of accessorRefs) {
					if (link instanceof AttributeLink) {
						isAttribute = true;
					} else if (link instanceof IndexLink) {
						isIndex = true;
					} else if (link.getName() === 'inverseBindMatrices') {
						isIBM = true;
					} else {
						isOther = true;
					}
				}

				// If the Accessor isn't used at all, treat it as "other".
				if (!isAttribute && !isIndex && !isIBM && !isOther) isOther = true;

				if (isAttribute && !isIndex && !isIBM && !isOther) {
					const primitive = accessorRefs[0].getParent() as Primitive;
					const primitiveAccessors = attributeAccessors.get(primitive) || new Set<Accessor>();
					primitiveAccessors.add(parent);
					attributeAccessors.set(primitive, primitiveAccessors);
				} else if (isIndex && !isAttribute && !isIBM && !isOther) {
					indexAccessors.add(parent);
				} else if (isIBM && !isAttribute && !isIndex && !isOther) {
					ibmAccessors.add(parent);
				} else if (isOther && !isAttribute && !isIndex && !isIBM) {
					otherAccessors.add(parent);
				} else {
					throw new Error('Attribute, index, or IBM accessors must be used only for that purpose.');
				}
			}

			// Write accessor groups to buffer views.

			const buffers: ArrayBuffer[] = [];
			const bufferIndex = json.buffers.length;
			let bufferByteLength = 0;

			if (indexAccessors.size) {
				const indexResult = concatAccessors(Array.from(indexAccessors), bufferIndex, bufferByteLength, BufferViewTarget.ELEMENT_ARRAY_BUFFER);
				bufferByteLength += indexResult.byteLength;
				buffers.push(...indexResult.buffers);
			}

			for (const primitiveAccessors of Array.from(attributeAccessors.values())) {
				if (primitiveAccessors.size) {
					const primitiveResult = interleaveAccessors(Array.from(primitiveAccessors), bufferIndex, bufferByteLength);
					bufferByteLength += primitiveResult.byteLength;
					buffers.push(...primitiveResult.buffers);
				}
			}

			if (ibmAccessors.size) {
				const ibmResult = concatAccessors(Array.from(ibmAccessors), bufferIndex, bufferByteLength);
				bufferByteLength += ibmResult.byteLength;
				buffers.push(...ibmResult.buffers);
			}

			if (otherAccessors.size) {
				const otherResult = concatAccessors(Array.from(otherAccessors), bufferIndex, bufferByteLength);
				bufferByteLength += otherResult.byteLength;
				buffers.push(...otherResult.buffers);
			}

			// We only support embedded images in GLB, so we know there is only one buffer.
			if (context.imageBufferViews.length) {
				for (let i = 0; i < context.imageBufferViews.length; i++) {
					json.bufferViews[json.images[i].bufferView].byteOffset = bufferByteLength;
					bufferByteLength += context.imageBufferViews[i].byteLength;
					buffers.push(context.imageBufferViews[i]);
				}
			}

			if (context.otherBufferViews.has(buffer)) {
				for (const data of context.otherBufferViews.get(buffer)) {
					json.bufferViews.push({
						buffer: bufferIndex,
						byteOffset: bufferByteLength,
						byteLength: data.byteLength,
					});
					context.otherBufferViewsIndexMap.set(data, json.bufferViews.length - 1);
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
			if (options.isGLB) {
				uri = GLB_BUFFER;
			} else {
				uri = context.bufferURIGenerator.createURI(buffer, 'bin');
				bufferDef.uri = uri;
			}

			// Write buffer views to buffer.

			bufferDef.byteLength = bufferByteLength;
			jsonDoc.resources[uri] = BufferUtils.concat(buffers);

			json.buffers.push(bufferDef);
		});

		if (root.listAccessors().find((a) => !a.getBuffer())) {
			logger.warn('Skipped writing one or more Accessors: no Buffer assigned.')
		}

		/* Materials. */

		json.materials = root.listMaterials().map((material, index) => {
			const materialDef = context.createPropertyDef(material) as GLTF.IMaterial;

			// Program state & blending.

			materialDef.alphaMode = material.getAlphaMode();
			if (material.getAlphaMode() === GLTF.MaterialAlphaMode.MASK) {
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
				const texture = material.getBaseColorTexture();
				const textureInfo = material.getBaseColorTextureInfo();
				materialDef.pbrMetallicRoughness.baseColorTexture = context.createTextureInfoDef(texture, textureInfo);
			}

			if (material.getEmissiveTexture()) {
				const texture = material.getEmissiveTexture();
				const textureInfo = material.getEmissiveTextureInfo();
				materialDef.emissiveTexture = context.createTextureInfoDef(texture, textureInfo);
			}

			if (material.getNormalTexture()) {
				const texture = material.getNormalTexture();
				const textureInfo = material.getNormalTextureInfo();
				const textureInfoDef = context.createTextureInfoDef(texture, textureInfo) as GLTF.IMaterialNormalTextureInfo;
				if (material.getNormalScale() !== 1) {
					textureInfoDef.scale = material.getNormalScale();
				}
				materialDef.normalTexture = textureInfoDef;
			}

			if (material.getOcclusionTexture()) {
				const texture = material.getOcclusionTexture();
				const textureInfo = material.getOcclusionTextureInfo();
				const textureInfoDef = context.createTextureInfoDef(texture, textureInfo) as GLTF.IMaterialOcclusionTextureInfo;
				if (material.getOcclusionStrength() !== 1) {
					textureInfoDef.strength = material.getOcclusionStrength();
				}
				materialDef.occlusionTexture = textureInfoDef;
			}

			if (material.getMetallicRoughnessTexture()) {
				const texture = material.getMetallicRoughnessTexture();
				const textureInfo = material.getMetallicRoughnessTextureInfo();
				materialDef.pbrMetallicRoughness.metallicRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
			}

			context.materialIndexMap.set(material, index);
			return materialDef;
		});

		/* Meshes. */

		json.meshes = root.listMeshes().map((mesh, index) => {
			const meshDef = context.createPropertyDef(mesh) as GLTF.IMesh;

			let targetNames: string[];

			meshDef.primitives = mesh.listPrimitives().map((primitive) => {
				const primitiveDef: GLTF.IMeshPrimitive = {attributes: {}};

				primitiveDef.mode = primitive.getMode();

				if (primitive.getMaterial()) {
					primitiveDef.material = context.materialIndexMap.get(primitive.getMaterial());
				}

				if (Object.keys(primitive.getExtras()).length) {
					primitiveDef.extras = primitive.getExtras();
				}

				if (primitive.getIndices()) {
					primitiveDef.indices = context.accessorIndexMap.get(primitive.getIndices());
				}

				for (const semantic of primitive.listSemantics()) {
					primitiveDef.attributes[semantic] = context.accessorIndexMap.get(primitive.getAttribute(semantic));
				}

				for (const target of primitive.listTargets()) {
					const targetDef = {};

					for (const semantic of target.listSemantics()) {
						targetDef[semantic] = context.accessorIndexMap.get(target.getAttribute(semantic));
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
				meshDef.extras.targetNames = targetNames;
			}

			context.meshIndexMap.set(mesh, index);
			return meshDef;
		});

		/** Cameras. */

		json.cameras = root.listCameras().map((camera, index) => {
			const cameraDef = context.createPropertyDef(camera) as GLTF.ICamera;
			cameraDef.type = camera.getType();
			if (cameraDef.type === GLTF.CameraType.PERSPECTIVE) {
				cameraDef.perspective = {
					znear: camera.getZNear(),
					zfar: camera.getZFar(),
					yfov: camera.getYFov(),
					aspectRatio: camera.getAspectRatio(),
				};
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
			nodeDef.translation = Array.from(node.getTranslation());
			nodeDef.rotation = Array.from(node.getRotation());
			nodeDef.scale = Array.from(node.getScale());

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

			if (skin.getInverseBindMatrices()) {
				skinDef.inverseBindMatrices = context.accessorIndexMap.get(skin.getInverseBindMatrices());
			}

			if (skin.getSkeleton()) {
				skinDef.skeleton = context.nodeIndexMap.get(skin.getSkeleton());
			}

			skinDef.joints = skin.listJoints().map((joint) => context.nodeIndexMap.get(joint));

			context.skinIndexMap.set(skin, index);
			return skinDef;
		});

		/** Node attachments. */

		root.listNodes().forEach((node, index) => {
			const nodeDef = json.nodes[index];

			if (node.getMesh()) {
				nodeDef.mesh = context.meshIndexMap.get(node.getMesh());
			}

			if (node.getCamera()) {
				nodeDef.camera = context.cameraIndexMap.get(node.getCamera());
			}

			if (node.getSkin()) {
				nodeDef.skin = context.skinIndexMap.get(node.getSkin());
			}

			if (node.listChildren().length > 0) {
				nodeDef.children = node.listChildren().map((node) => context.nodeIndexMap.get(node));
			}
		});

		/** Animations. */

		json.animations = root.listAnimations().map((animation) => {
			const animationDef = context.createPropertyDef(animation) as GLTF.IAnimation;

			const samplerIndexMap: Map<AnimationSampler, number> = new Map();

			animationDef.samplers = animation.listSamplers()
				.map((sampler, samplerIndex) => {
					const samplerDef = context.createPropertyDef(sampler) as GLTF.IAnimationSampler;
					samplerDef.input = context.accessorIndexMap.get(sampler.getInput());
					samplerDef.output = context.accessorIndexMap.get(sampler.getOutput());
					samplerDef.interpolation = sampler.getInterpolation();
					samplerIndexMap.set(sampler, samplerIndex);
					return samplerDef;
				})

			animationDef.channels = animation.listChannels()
				.map((channel) => {
					const channelDef = context.createPropertyDef(channel) as GLTF.IAnimationChannel;
					channelDef.sampler = samplerIndexMap.get(channel.getSampler());
					channelDef.target = {
						node: context.nodeIndexMap.get(channel.getTargetNode()),
						path: channel.getTargetPath(),
					};
					return channelDef;
				})

			return animationDef;
		});

		/* Scenes. */

		json.scenes = root.listScenes().map((scene) => {
			const sceneDef = context.createPropertyDef(scene) as GLTF.IScene;
			sceneDef.nodes = scene.listChildren().map((node) => context.nodeIndexMap.get(node));
			return sceneDef;
		});

		/* Extensions (2/2). */

		json.extensionsUsed = root.listExtensionsUsed().map((ext) => ext.extensionName);
		json.extensionsRequired = root.listExtensionsRequired().map((ext) => ext.extensionName);
		root.listExtensionsUsed().forEach((extension) => extension.write(context));

		//

		clean(json);

		return jsonDoc;
	}
}

/**
 * Removes empty and null values from an object.
 * @param object
 * @hidden
 */
function clean(object): void {
	const unused: string[] = [];

	for (const key in object) {
		const value = object[key];
		if (Array.isArray(value) && value.length === 0) {
			unused.push(key);
		} else if (value === null || value === '') {
			unused.push(value);
		}
	}

	for (const key of unused) {
		delete object[key];
	}
}
