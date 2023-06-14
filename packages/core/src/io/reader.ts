import { GLB_BUFFER, PropertyType, TypedArray, mat4, vec3, vec4, ComponentTypeToTypedArray } from '../constants.js';
import { Document } from '../document.js';
import type { Extension } from '../extension.js';
import type { JSONDocument } from '../json-document.js';
import { Accessor, AnimationSampler, Camera } from '../properties/index.js';
import type { GLTF } from '../types/gltf.js';
import { BufferUtils, FileUtils, ILogger, ImageUtils, Logger, MathUtils } from '../utils/index.js';
import { ReaderContext } from './reader-context.js';

export interface ReaderOptions {
	logger?: ILogger;
	extensions: (typeof Extension)[];
	dependencies: { [key: string]: unknown };
}

const DEFAULT_OPTIONS: ReaderOptions = {
	logger: Logger.DEFAULT_INSTANCE,
	extensions: [],
	dependencies: {},
};

/** @internal */
export class GLTFReader {
	public static read(jsonDoc: JSONDocument, _options: ReaderOptions = DEFAULT_OPTIONS): Document {
		const options = { ...DEFAULT_OPTIONS, ..._options } as Required<ReaderOptions>;
		const { json } = jsonDoc;
		const document = new Document().setLogger(options.logger);

		this.validate(jsonDoc, options);

		/* Reader context. */

		const context = new ReaderContext(jsonDoc);

		/** Asset. */

		const assetDef = json.asset;
		const asset = document.getRoot().getAsset();

		if (assetDef.copyright) asset.copyright = assetDef.copyright;
		if (assetDef.extras) asset.extras = assetDef.extras;

		if (json.extras !== undefined) {
			document.getRoot().setExtras({ ...json.extras });
		}

		/** Extensions (1/2). */

		const extensionsUsed = json.extensionsUsed || [];
		const extensionsRequired = json.extensionsRequired || [];
		for (const Extension of options.extensions) {
			if (extensionsUsed.includes(Extension.EXTENSION_NAME)) {
				const extension = document
					.createExtension(Extension as unknown as new (doc: Document) => Extension)
					.setRequired(extensionsRequired.includes(Extension.EXTENSION_NAME));

				for (const key of extension.readDependencies) {
					extension.install(key, options.dependencies[key]);
				}
			}
		}

		/** Buffers. */

		const bufferDefs = json.buffers || [];
		document
			.getRoot()
			.listExtensionsUsed()
			.filter((extension) => extension.prereadTypes.includes(PropertyType.BUFFER))
			.forEach((extension) => extension.preread(context, PropertyType.BUFFER));
		context.buffers = bufferDefs.map((bufferDef) => {
			const buffer = document.createBuffer(bufferDef.name);

			if (bufferDef.extras) buffer.setExtras(bufferDef.extras);

			if (bufferDef.uri && bufferDef.uri.indexOf('__') !== 0) {
				buffer.setURI(bufferDef.uri);
			}

			return buffer;
		});

		/** Buffer views. */

		const bufferViewDefs = json.bufferViews || [];
		context.bufferViewBuffers = bufferViewDefs.map((bufferViewDef, index) => {
			if (!context.bufferViews[index]) {
				const bufferDef = jsonDoc.json.buffers![bufferViewDef.buffer];
				const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
				const byteOffset = bufferViewDef.byteOffset || 0;
				context.bufferViews[index] = BufferUtils.toView(resource, byteOffset, bufferViewDef.byteLength);
			}

			return context.buffers[bufferViewDef.buffer];
		});

		/** Accessors. */

		// Accessor .count and .componentType properties are inferred dynamically.
		const accessorDefs = json.accessors || [];
		context.accessors = accessorDefs.map((accessorDef) => {
			const buffer = context.bufferViewBuffers[accessorDef.bufferView!];
			const accessor = document.createAccessor(accessorDef.name, buffer).setType(accessorDef.type);

			if (accessorDef.extras) accessor.setExtras(accessorDef.extras);

			if (accessorDef.normalized !== undefined) {
				accessor.setNormalized(accessorDef.normalized);
			}

			// Sparse accessors, KHR_draco_mesh_compression, and EXT_meshopt_compression.
			if (accessorDef.bufferView === undefined) return accessor;

			// NOTICE: We mark sparse accessors at the end of the I/O reading process. Consider an
			// accessor to be 'sparse' if it (A) includes sparse value overrides, or (B) does not
			// define .bufferView _and_ no extension provides that data.

			accessor.setArray(getAccessorArray(accessorDef, context));
			return accessor;
		});

		/** Textures. */

		// glTF Transform's "Texture" properties correspond 1:1 with glTF "Image" properties, and
		// with image files. The glTF file may contain more one texture per image, where images
		// are reused with different sampler properties.
		const imageDefs = json.images || [];
		const textureDefs = json.textures || [];
		document
			.getRoot()
			.listExtensionsUsed()
			.filter((extension) => extension.prereadTypes.includes(PropertyType.TEXTURE))
			.forEach((extension) => extension.preread(context, PropertyType.TEXTURE));
		context.textures = imageDefs.map((imageDef) => {
			const texture = document.createTexture(imageDef.name);

			// glTF Image corresponds 1:1 with glTF Transform Texture. See `writer.ts`.
			if (imageDef.extras) texture.setExtras(imageDef.extras);

			if (imageDef.bufferView !== undefined) {
				const bufferViewDef = json.bufferViews![imageDef.bufferView];
				const bufferDef = jsonDoc.json.buffers![bufferViewDef.buffer];
				const bufferData = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
				const byteOffset = bufferViewDef.byteOffset || 0;
				const byteLength = bufferViewDef.byteLength;
				const imageData = bufferData.slice(byteOffset, byteOffset + byteLength);
				texture.setImage(imageData);
			} else if (imageDef.uri !== undefined) {
				texture.setImage(jsonDoc.resources[imageDef.uri]);
				if (imageDef.uri.indexOf('__') !== 0) {
					texture.setURI(imageDef.uri);
				}
			}

			if (imageDef.mimeType !== undefined) {
				texture.setMimeType(imageDef.mimeType);
			} else if (imageDef.uri) {
				const extension = FileUtils.extension(imageDef.uri);
				texture.setMimeType(ImageUtils.extensionToMimeType(extension));
			}

			return texture;
		});

		/** Materials. */

		const materialDefs = json.materials || [];
		context.materials = materialDefs.map((materialDef) => {
			const material = document.createMaterial(materialDef.name);

			if (materialDef.extras) material.setExtras(materialDef.extras);

			// Program state & blending.

			if (materialDef.alphaMode !== undefined) {
				material.setAlphaMode(materialDef.alphaMode);
			}

			if (materialDef.alphaCutoff !== undefined) {
				material.setAlphaCutoff(materialDef.alphaCutoff);
			}

			if (materialDef.doubleSided !== undefined) {
				material.setDoubleSided(materialDef.doubleSided);
			}

			// Factors.

			const pbrDef = materialDef.pbrMetallicRoughness || {};

			if (pbrDef.baseColorFactor !== undefined) {
				material.setBaseColorFactor(pbrDef.baseColorFactor as vec4);
			}

			if (materialDef.emissiveFactor !== undefined) {
				material.setEmissiveFactor(materialDef.emissiveFactor as vec3);
			}

			if (pbrDef.metallicFactor !== undefined) {
				material.setMetallicFactor(pbrDef.metallicFactor);
			}

			if (pbrDef.roughnessFactor !== undefined) {
				material.setRoughnessFactor(pbrDef.roughnessFactor);
			}

			// Textures.

			if (pbrDef.baseColorTexture !== undefined) {
				const textureInfoDef = pbrDef.baseColorTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source!];
				material.setBaseColorTexture(texture);
				context.setTextureInfo(material.getBaseColorTextureInfo()!, textureInfoDef);
			}

			if (materialDef.emissiveTexture !== undefined) {
				const textureInfoDef = materialDef.emissiveTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source!];
				material.setEmissiveTexture(texture);
				context.setTextureInfo(material.getEmissiveTextureInfo()!, textureInfoDef);
			}

			if (materialDef.normalTexture !== undefined) {
				const textureInfoDef = materialDef.normalTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source!];
				material.setNormalTexture(texture);
				context.setTextureInfo(material.getNormalTextureInfo()!, textureInfoDef);
				if (materialDef.normalTexture.scale !== undefined) {
					material.setNormalScale(materialDef.normalTexture.scale);
				}
			}

			if (materialDef.occlusionTexture !== undefined) {
				const textureInfoDef = materialDef.occlusionTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source!];
				material.setOcclusionTexture(texture);
				context.setTextureInfo(material.getOcclusionTextureInfo()!, textureInfoDef);
				if (materialDef.occlusionTexture.strength !== undefined) {
					material.setOcclusionStrength(materialDef.occlusionTexture.strength);
				}
			}

			if (pbrDef.metallicRoughnessTexture !== undefined) {
				const textureInfoDef = pbrDef.metallicRoughnessTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source!];
				material.setMetallicRoughnessTexture(texture);
				context.setTextureInfo(material.getMetallicRoughnessTextureInfo()!, textureInfoDef);
			}

			return material;
		});

		/** Meshes. */

		const meshDefs = json.meshes || [];
		document
			.getRoot()
			.listExtensionsUsed()
			.filter((extension) => extension.prereadTypes.includes(PropertyType.PRIMITIVE))
			.forEach((extension) => extension.preread(context, PropertyType.PRIMITIVE));
		context.meshes = meshDefs.map((meshDef) => {
			const mesh = document.createMesh(meshDef.name);

			if (meshDef.extras) mesh.setExtras(meshDef.extras);

			if (meshDef.weights !== undefined) {
				mesh.setWeights(meshDef.weights);
			}

			const primitiveDefs = meshDef.primitives || [];
			primitiveDefs.forEach((primitiveDef) => {
				const primitive = document.createPrimitive();

				if (primitiveDef.extras) primitive.setExtras(primitiveDef.extras);

				if (primitiveDef.material !== undefined) {
					primitive.setMaterial(context.materials[primitiveDef.material]);
				}

				if (primitiveDef.mode !== undefined) {
					primitive.setMode(primitiveDef.mode);
				}

				for (const [semantic, index] of Object.entries(primitiveDef.attributes || {})) {
					primitive.setAttribute(semantic, context.accessors[index]);
				}

				if (primitiveDef.indices !== undefined) {
					primitive.setIndices(context.accessors[primitiveDef.indices]);
				}

				const targetNames: string[] = (meshDef.extras && (meshDef.extras.targetNames as string[])) || [];
				const targetDefs = primitiveDef.targets || [];
				targetDefs.forEach((targetDef, targetIndex) => {
					const targetName = targetNames[targetIndex] || targetIndex.toString();
					const target = document.createPrimitiveTarget(targetName);

					for (const [semantic, accessorIndex] of Object.entries(targetDef)) {
						target.setAttribute(semantic, context.accessors[accessorIndex]);
					}

					primitive.addTarget(target);
				});

				mesh.addPrimitive(primitive);
			});

			return mesh;
		});

		/** Cameras. */

		const cameraDefs = json.cameras || [];
		context.cameras = cameraDefs.map((cameraDef) => {
			const camera = document.createCamera(cameraDef.name).setType(cameraDef.type);

			if (cameraDef.extras) camera.setExtras(cameraDef.extras);

			if (cameraDef.type === Camera.Type.PERSPECTIVE) {
				const perspectiveDef = cameraDef.perspective!;
				camera.setYFov(perspectiveDef.yfov);
				camera.setZNear(perspectiveDef.znear);
				if (perspectiveDef.zfar !== undefined) {
					camera.setZFar(perspectiveDef.zfar);
				}
				if (perspectiveDef.aspectRatio !== undefined) {
					camera.setAspectRatio(perspectiveDef.aspectRatio);
				}
			} else {
				const orthoDef = cameraDef.orthographic!;
				camera.setZNear(orthoDef.znear).setZFar(orthoDef.zfar).setXMag(orthoDef.xmag).setYMag(orthoDef.ymag);
			}
			return camera;
		});

		/** Nodes. */

		const nodeDefs = json.nodes || [];

		document
			.getRoot()
			.listExtensionsUsed()
			.filter((extension) => extension.prereadTypes.includes(PropertyType.NODE))
			.forEach((extension) => extension.preread(context, PropertyType.NODE));

		context.nodes = nodeDefs.map((nodeDef) => {
			const node = document.createNode(nodeDef.name);

			if (nodeDef.extras) node.setExtras(nodeDef.extras);

			if (nodeDef.translation !== undefined) {
				node.setTranslation(nodeDef.translation as vec3);
			}

			if (nodeDef.rotation !== undefined) {
				node.setRotation(nodeDef.rotation as vec4);
			}

			if (nodeDef.scale !== undefined) {
				node.setScale(nodeDef.scale as vec3);
			}

			if (nodeDef.matrix !== undefined) {
				const translation = [0, 0, 0] as vec3;
				const rotation = [0, 0, 0, 1] as vec4;
				const scale = [1, 1, 1] as vec3;

				MathUtils.decompose(nodeDef.matrix as mat4, translation, rotation, scale);

				node.setTranslation(translation);
				node.setRotation(rotation);
				node.setScale(scale);
			}

			if (nodeDef.weights !== undefined) {
				node.setWeights(nodeDef.weights);
			}

			// Attachments (mesh, camera, skin) defined later in reading process.

			return node;
		});

		/** Skins. */

		const skinDefs = json.skins || [];
		context.skins = skinDefs.map((skinDef) => {
			const skin = document.createSkin(skinDef.name);

			if (skinDef.extras) skin.setExtras(skinDef.extras);

			if (skinDef.inverseBindMatrices !== undefined) {
				skin.setInverseBindMatrices(context.accessors[skinDef.inverseBindMatrices]);
			}

			if (skinDef.skeleton !== undefined) {
				skin.setSkeleton(context.nodes[skinDef.skeleton]);
			}

			for (const nodeIndex of skinDef.joints) {
				skin.addJoint(context.nodes[nodeIndex]);
			}

			return skin;
		});

		/** Node attachments. */

		nodeDefs.map((nodeDef, nodeIndex) => {
			const node = context.nodes[nodeIndex];

			const children = nodeDef.children || [];
			children.forEach((childIndex) => node.addChild(context.nodes[childIndex]));

			if (nodeDef.mesh !== undefined) node.setMesh(context.meshes[nodeDef.mesh]);

			if (nodeDef.camera !== undefined) node.setCamera(context.cameras[nodeDef.camera]);

			if (nodeDef.skin !== undefined) node.setSkin(context.skins[nodeDef.skin]);
		});

		/** Animations. */

		const animationDefs = json.animations || [];
		context.animations = animationDefs.map((animationDef) => {
			const animation = document.createAnimation(animationDef.name);

			if (animationDef.extras) animation.setExtras(animationDef.extras);

			const samplerDefs = animationDef.samplers || [];
			const samplers = samplerDefs.map((samplerDef) => {
				const sampler = document
					.createAnimationSampler()
					.setInput(context.accessors[samplerDef.input])
					.setOutput(context.accessors[samplerDef.output])
					.setInterpolation(samplerDef.interpolation || AnimationSampler.Interpolation.LINEAR);

				if (samplerDef.extras) sampler.setExtras(samplerDef.extras);

				animation.addSampler(sampler);
				return sampler;
			});

			const channels = animationDef.channels || [];
			channels.forEach((channelDef) => {
				const channel = document
					.createAnimationChannel()
					.setSampler(samplers[channelDef.sampler])
					.setTargetPath(channelDef.target.path);

				if (channelDef.target.node !== undefined) channel.setTargetNode(context.nodes[channelDef.target.node]);
				if (channelDef.extras) channel.setExtras(channelDef.extras);

				animation.addChannel(channel);
			});

			return animation;
		});

		/** Scenes. */

		const sceneDefs = json.scenes || [];

		document
			.getRoot()
			.listExtensionsUsed()
			.filter((extension) => extension.prereadTypes.includes(PropertyType.SCENE))
			.forEach((extension) => extension.preread(context, PropertyType.SCENE));

		context.scenes = sceneDefs.map((sceneDef) => {
			const scene = document.createScene(sceneDef.name);

			if (sceneDef.extras) scene.setExtras(sceneDef.extras);

			const children = sceneDef.nodes || [];

			children.map((nodeIndex) => context.nodes[nodeIndex]).forEach((node) => scene.addChild(node));

			return scene;
		});

		if (json.scene !== undefined) {
			document.getRoot().setDefaultScene(context.scenes[json.scene]);
		}

		/** Extensions (2/2). */

		document
			.getRoot()
			.listExtensionsUsed()
			.forEach((extension) => extension.read(context));

		/** Post-processing. */

		// Consider an accessor to be 'sparse' if it (A) includes sparse value overrides,
		// or (B) does not define .bufferView _and_ no extension provides that data. Case
		// (B) represents a zero-filled accessor.
		accessorDefs.forEach((accessorDef, index) => {
			const accessor = context.accessors[index];
			const hasSparseValues = !!accessorDef.sparse;
			const isZeroFilled = !accessorDef.bufferView && !accessor.getArray();
			if (hasSparseValues || isZeroFilled) {
				accessor.setSparse(true).setArray(getSparseArray(accessorDef, context));
			}
		});

		return document;
	}

	private static validate(jsonDoc: JSONDocument, options: Required<ReaderOptions>): void {
		const json = jsonDoc.json;

		if (json.asset.version !== '2.0') {
			throw new Error(`Unsupported glTF version, "${json.asset.version}".`);
		}

		if (json.extensionsRequired) {
			for (const extensionName of json.extensionsRequired) {
				if (!options.extensions.find((extension) => extension.EXTENSION_NAME === extensionName)) {
					throw new Error(`Missing required extension, "${extensionName}".`);
				}
			}
		}

		if (json.extensionsUsed) {
			for (const extensionName of json.extensionsUsed) {
				if (!options.extensions.find((extension) => extension.EXTENSION_NAME === extensionName)) {
					options.logger.warn(`Missing optional extension, "${extensionName}".`);
				}
			}
		}
	}
}

/**
 * Returns the contents of an interleaved accessor, as a typed array.
 * @internal
 */
function getInterleavedArray(accessorDef: GLTF.IAccessor, context: ReaderContext): TypedArray {
	const jsonDoc = context.jsonDoc;
	const bufferView = context.bufferViews[accessorDef.bufferView!];
	const bufferViewDef = jsonDoc.json.bufferViews![accessorDef.bufferView!];

	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const elementSize = Accessor.getElementSize(accessorDef.type);
	const componentSize = TypedArray.BYTES_PER_ELEMENT;
	const accessorByteOffset = accessorDef.byteOffset || 0;

	const array = new TypedArray(accessorDef.count * elementSize);
	const view = new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
	const byteStride = bufferViewDef.byteStride!;

	for (let i = 0; i < accessorDef.count; i++) {
		for (let j = 0; j < elementSize; j++) {
			const byteOffset = accessorByteOffset + i * byteStride + j * componentSize;
			let value: number;
			switch (accessorDef.componentType) {
				case Accessor.ComponentType.FLOAT:
					value = view.getFloat32(byteOffset, true);
					break;
				case Accessor.ComponentType.UNSIGNED_INT:
					value = view.getUint32(byteOffset, true);
					break;
				case Accessor.ComponentType.UNSIGNED_SHORT:
					value = view.getUint16(byteOffset, true);
					break;
				case Accessor.ComponentType.UNSIGNED_BYTE:
					value = view.getUint8(byteOffset);
					break;
				case Accessor.ComponentType.SHORT:
					value = view.getInt16(byteOffset, true);
					break;
				case Accessor.ComponentType.BYTE:
					value = view.getInt8(byteOffset);
					break;
				default:
					throw new Error(`Unexpected componentType "${accessorDef.componentType}".`);
			}
			array[i * elementSize + j] = value;
		}
	}

	return array;
}

/**
 * Returns the contents of an accessor, as a typed array.
 * @internal
 */
function getAccessorArray(accessorDef: GLTF.IAccessor, context: ReaderContext): TypedArray {
	const jsonDoc = context.jsonDoc;
	const bufferView = context.bufferViews[accessorDef.bufferView!];
	const bufferViewDef = jsonDoc.json.bufferViews![accessorDef.bufferView!];

	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const elementSize = Accessor.getElementSize(accessorDef.type);
	const componentSize = TypedArray.BYTES_PER_ELEMENT;
	const elementStride = elementSize * componentSize;

	// Interleaved buffer view.
	if (bufferViewDef.byteStride !== undefined && bufferViewDef.byteStride !== elementStride) {
		return getInterleavedArray(accessorDef, context);
	}

	const byteOffset = bufferView.byteOffset + (accessorDef.byteOffset || 0);
	const byteLength = accessorDef.count * elementSize * componentSize;

	// Might optimize this to avoid deep copy later, but it's useful for now and not a known
	// bottleneck. See https://github.com/donmccurdy/glTF-Transform/issues/256.
	return new TypedArray(bufferView.buffer.slice(byteOffset, byteOffset + byteLength));
}

/**
 * Returns the contents of a sparse accessor, as a typed array.
 * @internal
 */
function getSparseArray(accessorDef: GLTF.IAccessor, context: ReaderContext): TypedArray {
	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const elementSize = Accessor.getElementSize(accessorDef.type);

	let array: TypedArray;
	if (accessorDef.bufferView !== undefined) {
		array = getAccessorArray(accessorDef, context);
	} else {
		array = new TypedArray(accessorDef.count * elementSize);
	}

	const sparseDef = accessorDef.sparse;
	if (!sparseDef) return array; // Zero-filled accessor.

	const count = sparseDef.count;
	const indicesDef = { ...accessorDef, ...sparseDef.indices, count, type: 'SCALAR' };
	const valuesDef = { ...accessorDef, ...sparseDef.values, count };
	const indices = getAccessorArray(indicesDef as GLTF.IAccessor, context);
	const values = getAccessorArray(valuesDef, context);

	// Override indices given in the sparse data.
	for (let i = 0; i < indicesDef.count; i++) {
		for (let j = 0; j < elementSize; j++) {
			array[indices[i] * elementSize + j] = values[i * elementSize + j];
		}
	}

	return array;
}
