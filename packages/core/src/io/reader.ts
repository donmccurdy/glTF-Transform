import { getRotation, getScaling, getTranslation } from 'gl-matrix/mat4'
import { GLB_BUFFER, TypedArray, vec3, vec4 } from '../constants';
import { Document } from '../document';
import { Extension } from '../extension';
import { NativeDocument } from '../native-document';
import { Accessor, Animation, Buffer, Camera, Material, Mesh, Node, Scene, Skin, Texture, TextureInfo, TextureSampler } from '../properties';
import { FileUtils } from '../utils';

const ComponentTypeToTypedArray = {
	'5120': Int8Array,
	'5121': Uint8Array,
	'5122': Int16Array,
	'5123': Uint16Array,
	'5125': Uint32Array,
	'5126': Float32Array,
};

export interface ReaderContext {
	nativeDocument: NativeDocument;
	buffers: Buffer[];
	bufferViewBuffers: Buffer[];
	accessors: Accessor[];
	textures: Texture[];
	materials: Material[];
	meshes: Mesh[];
	cameras: Camera[];
	nodes: Node[];
	skins: Skin[];
	animations: Animation[];
	scenes: Scene[];
}

export interface ReaderOptions {
	extensions: (typeof Extension)[];
}

/** @hidden */
export class GLTFReader {
	public static read(nativeDoc: NativeDocument, options: ReaderOptions): Document {
		const {json} = nativeDoc;
		const doc = new Document();

		if (json.asset.version !== '2.0') {
			throw new Error(`Unsupported glTF version: "${json.asset.version}".`);
		}

		const context = {
			document: doc,
			nativeDocument: nativeDoc,
			buffers: [],
			bufferViewBuffers: [],
			accessors: [],
			textures: [],
			materials: [],
			meshes: [],
			cameras: [],
			nodes: [],
			skins: [],
			animations: [],
			scenes: [],
		} as ReaderContext;

		/** Buffers. */

		const bufferDefs = json.buffers || [];
		context.buffers = bufferDefs.map((bufferDef) => {
			const buffer = doc.createBuffer(bufferDef.name);
			if (bufferDef.uri && bufferDef.uri.indexOf('__') !== 0) {
				buffer.setURI(bufferDef.uri);
			}
			return buffer;
		});

		/** Buffer views. */

		const bufferViewDefs = json.bufferViews || [];
		context.bufferViewBuffers = bufferViewDefs.map((bufferViewDef) => {
			return context.buffers[bufferViewDef.buffer];
		});

		/** Accessors. */

		// Accessor .count and .componentType properties are inferred dynamically.
		const accessorDefs = json.accessors || [];
		context.accessors = accessorDefs.map((accessorDef) => {
			const buffer = context.bufferViewBuffers[accessorDef.bufferView];
			const accessor = doc.createAccessor(accessorDef.name, buffer);
			accessor.setType(accessorDef.type);

			let array: TypedArray;

			if (accessorDef.sparse !== undefined) {
				array = getSparseArray(accessorDef, nativeDoc);
			} else {
				// TODO(cleanup): Relying to much on ArrayBuffers: requires copying.
				array = getAccessorArray(accessorDef, nativeDoc).slice();
			}

			if (accessorDef.normalized !== undefined) {
				accessor.setNormalized(accessorDef.normalized);
			}

			accessor.setArray(array);
			return accessor;
		});

		/** Textures. */

		// glTF-Transform's "Texture" properties correspond 1:1 with glTF "Image" properties, and
		// with image files. The glTF file may contain more one texture per image, where images
		// are reused with different sampler properties.
		const imageDefs = json.images || [];
		const textureDefs = json.textures || [];
		context.textures = imageDefs.map((imageDef) => {
			const texture = doc.createTexture(imageDef.name);

			if (imageDef.bufferView !== undefined) {
				const bufferViewDef = json.bufferViews[imageDef.bufferView];
				const bufferDef = nativeDoc.json.buffers[bufferViewDef.buffer];
				const bufferData = bufferDef.uri
					? nativeDoc.resources[bufferDef.uri]
					: nativeDoc.resources[GLB_BUFFER];
				const byteOffset = bufferViewDef.byteOffset || 0;
				const byteLength = bufferViewDef.byteLength;
				const imageData = bufferData.slice(byteOffset, byteOffset + byteLength);
				texture.setImage(imageData);
			} else if (imageDef.uri !== undefined) {
				texture.setImage(nativeDoc.resources[imageDef.uri]);
				if (imageDef.uri.indexOf('__') !== 0) {
					texture.setURI(imageDef.uri);
				}
			}

			if (imageDef.mimeType !== undefined) {
				texture.setMimeType(imageDef.mimeType);
			} else if (imageDef.uri) {
				const extension = FileUtils.extension(imageDef.uri);
				texture.setMimeType(extension === 'png' ? 'image/png' : 'image/jpeg');
			}

			return texture;
		});

		/** Materials. */

		const materialDefs = json.materials || [];
		context.materials = materialDefs.map((materialDef) => {
			const material = doc.createMaterial(materialDef.name);

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
				const texture = context.textures[textureDefs[textureInfoDef.index].source];
				material.setBaseColorTexture(texture);
				setTextureInfo(material.getBaseColorTextureInfo(), textureInfoDef);
				setTextureSampler(material.getBaseColorTextureSampler(), textureInfoDef, nativeDoc);
			}

			if (materialDef.emissiveTexture !== undefined) {
				const textureInfoDef = materialDef.emissiveTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source];
				material.setEmissiveTexture(texture);
				setTextureInfo(material.getEmissiveTextureInfo(), textureInfoDef);
				setTextureSampler(material.getEmissiveTextureSampler(), textureInfoDef, nativeDoc);
			}

			if (materialDef.normalTexture !== undefined) {
				const textureInfoDef = materialDef.normalTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source];
				material.setNormalTexture(texture);
				setTextureInfo(material.getNormalTextureInfo(), textureInfoDef);
				setTextureSampler(material.getNormalTextureSampler(), textureInfoDef, nativeDoc);
				if (materialDef.normalTexture.scale !== undefined) {
					material.setNormalScale(materialDef.normalTexture.scale);
				}
			}

			if (materialDef.occlusionTexture !== undefined) {
				const textureInfoDef = materialDef.occlusionTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source];
				material.setOcclusionTexture(texture);
				setTextureInfo(material.getOcclusionTextureInfo(), textureInfoDef);
				setTextureSampler(material.getOcclusionTextureSampler(), textureInfoDef, nativeDoc);
				if (materialDef.occlusionTexture.strength !== undefined) {
					material.setOcclusionStrength(materialDef.occlusionTexture.strength);
				}
			}

			if (pbrDef.metallicRoughnessTexture !== undefined) {
				const textureInfoDef = pbrDef.metallicRoughnessTexture;
				const texture = context.textures[textureDefs[textureInfoDef.index].source];
				material.setMetallicRoughnessTexture(texture);
				setTextureInfo(material.getMetallicRoughnessTextureInfo(), textureInfoDef);
				setTextureSampler(material.getMetallicRoughnessTextureSampler(), textureInfoDef, nativeDoc);
			}

			return material;
		});

		/** Meshes. */

		const meshDefs = json.meshes || [];
		context.meshes = meshDefs.map((meshDef) => {
			const mesh = doc.createMesh(meshDef.name);

			if (meshDef.weights !== undefined) {
				mesh.setWeights(meshDef.weights);
			}

			meshDef.primitives.forEach((primitiveDef) => {
				const primitive = doc.createPrimitive();

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

				const targetNames = meshDef.extras && meshDef.extras.targetNames || [];
				const targetDefs = primitiveDef.targets || [];
				targetDefs.forEach((targetDef, targetIndex) => {
					const targetName = targetNames[targetIndex] || targetIndex.toString();
					const target = doc.createPrimitiveTarget(targetName);

					for (const [semantic, accessorIndex] of Object.entries(targetDef)) {
						target.setAttribute(semantic, context.accessors[accessorIndex]);
					}

					primitive.addTarget(target);
				});

				mesh.addPrimitive(primitive);
			})

			return mesh;
		});

		/** Cameras. */

		const cameraDefs = json.cameras || [];
		context.cameras = cameraDefs.map((cameraDef) => {
			const camera = doc.createCamera(cameraDef.name).setType(cameraDef.type);
			if (cameraDef.type === GLTF.CameraType.PERSPECTIVE) {
				camera
					.setZNear(cameraDef.perspective.znear)
					.setZFar(cameraDef.perspective.zfar)
					.setYFov(cameraDef.perspective.yfov)
					.setAspectRatio(cameraDef.perspective.aspectRatio);
			} else {
				camera
					.setZNear(cameraDef.orthographic.znear)
					.setZFar(cameraDef.orthographic.zfar)
					.setXMag(cameraDef.orthographic.xmag)
					.setYMag(cameraDef.orthographic.ymag);
			}
			return camera;
		});

		/** Nodes. */

		const nodeDefs = json.nodes || [];
		context.nodes = nodeDefs.map((nodeDef) => {
			const node = doc.createNode(nodeDef.name);

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
				node.setTranslation(getTranslation([], nodeDef.matrix) as vec3);
				node.setRotation(getRotation([], nodeDef.matrix) as vec4);
				node.setScale(getScaling([], nodeDef.matrix) as vec3);
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
			const skin = doc.createSkin(skinDef.name);

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
		})

		/** Animations. */

		const animationDefs = json.animations || [];
		context.animations = animationDefs.map((animationDef) => {
			const animation = doc.createAnimation(animationDef.name);

			const samplerDefs = animationDef.samplers || [];
			const samplers = samplerDefs.map((samplerDef) => {
				const sampler = doc.createAnimationSampler()
					.setInput(context.accessors[samplerDef.input])
					.setOutput(context.accessors[samplerDef.output])
					.setInterpolation(samplerDef.interpolation || GLTF.AnimationSamplerInterpolation.LINEAR);
				animation.addSampler(sampler);
				return sampler;
			})

			const channels = animationDef.channels || [];
			channels.forEach((channelDef) => {
				const channel = doc.createAnimationChannel()
					.setSampler(samplers[channelDef.sampler])
					.setTargetNode(context.nodes[channelDef.target.node])
					.setTargetPath(channelDef.target.path);
				animation.addChannel(channel);
			});

			return animation;
		});

		/** Scenes. */

		const sceneDefs = json.scenes || [];
		context.scenes = sceneDefs.map((sceneDef) => {
			const scene = doc.createScene(sceneDef.name);

			const children = sceneDef.nodes || [];

			children
			.map((nodeIndex) => context.nodes[nodeIndex])
			.forEach((node) => (scene.addNode(node)));

			return scene;
		});

		/** Extensions. */

		for (const Extension of options.extensions) {
			if (json.extensionsUsed.includes(Extension.EXTENSION_NAME)) {
				const ExtensionImpl = Extension as unknown as new (doc: Document) => Extension;
				new ExtensionImpl(doc).read(context);
			}
		}

		return doc;
	}
}

// eslint-disable-next-line max-len
function setTextureInfo(textureInfo: TextureInfo, textureInfoDef: GLTF.ITextureInfo): void {
	if (textureInfoDef.texCoord !== undefined) {
		textureInfo.setTexCoord(textureInfoDef.texCoord);
	}
}

// eslint-disable-next-line max-len
function setTextureSampler(textureSampler: TextureSampler, textureInfoDef: GLTF.ITextureInfo, nativeDoc: NativeDocument): void {
	const textureDef = nativeDoc.json.textures[textureInfoDef.index];

	if (textureDef.sampler === undefined) return;

	const samplerDef = nativeDoc.json.samplers[textureDef.sampler];

	if (samplerDef.magFilter !== undefined) {
		textureSampler.setMagFilter(samplerDef.magFilter);
	}
	if (samplerDef.minFilter !== undefined) {
		textureSampler.setMinFilter(samplerDef.minFilter);
	}
	if (samplerDef.wrapS !== undefined) {
		textureSampler.setWrapS(samplerDef.wrapS);
	}
	if (samplerDef.wrapT !== undefined) {
		textureSampler.setWrapT(samplerDef.wrapT);
	}
}

/**
 * Returns the contents of an interleaved accessor, as a typed array.
 * @hidden
 */
function getInterleavedArray(accessorDef: GLTF.IAccessor, nativeDoc: NativeDocument): TypedArray {
	const bufferViewDef = nativeDoc.json.bufferViews[accessorDef.bufferView];
	const bufferDef = nativeDoc.json.buffers[bufferViewDef.buffer];
	const resource = bufferDef.uri ? nativeDoc.resources[bufferDef.uri] : nativeDoc.resources[GLB_BUFFER];

	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const elementSize = Accessor.getElementSize(accessorDef.type);
	const componentSize = TypedArray.BYTES_PER_ELEMENT;
	const accessorByteOffset = accessorDef.byteOffset || 0;

	const array = new TypedArray(accessorDef.count * elementSize);
	const view = new DataView(resource, bufferViewDef.byteOffset, bufferViewDef.byteLength);
	const byteStride = bufferViewDef.byteStride;

	for (let i = 0; i < accessorDef.count; i++) {
		for (let j = 0; j < elementSize; j++) {
			const byteOffset = accessorByteOffset + i * byteStride + j * componentSize;
			let value: number;
			switch (accessorDef.componentType) {
				case GLTF.AccessorComponentType.FLOAT:
					value = view.getFloat32(byteOffset, true);
					break;
				case GLTF.AccessorComponentType.UNSIGNED_INT:
					value = view.getUint32(byteOffset, true);
					break;
				case GLTF.AccessorComponentType.UNSIGNED_SHORT:
					value = view.getUint16(byteOffset, true);
					break;
				case GLTF.AccessorComponentType.UNSIGNED_BYTE:
					value = view.getUint8(byteOffset);
					break;
				case GLTF.AccessorComponentType.SHORT:
					value = view.getInt16(byteOffset, true);
					break;
				case GLTF.AccessorComponentType.BYTE:
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
 * @hidden
 */
function getAccessorArray(accessorDef: GLTF.IAccessor, nativeDoc: NativeDocument): TypedArray {
	const bufferViewDef = nativeDoc.json.bufferViews[accessorDef.bufferView];
	const bufferDef = nativeDoc.json.buffers[bufferViewDef.buffer];
	const resource = bufferDef.uri ? nativeDoc.resources[bufferDef.uri] : nativeDoc.resources[GLB_BUFFER];

	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const elementSize = Accessor.getElementSize(accessorDef.type);
	const componentSize = TypedArray.BYTES_PER_ELEMENT;
	const elementStride = elementSize * componentSize;

	// Interleaved buffer view.
	if (bufferViewDef.byteStride !== undefined && bufferViewDef.byteStride !==  elementStride) {
		return getInterleavedArray(accessorDef, nativeDoc);
	}

	const start = (bufferViewDef.byteOffset || 0) + (accessorDef.byteOffset || 0);

	switch (accessorDef.componentType) {
		case GLTF.AccessorComponentType.FLOAT:
			return new Float32Array(resource, start, accessorDef.count * elementSize);
		case GLTF.AccessorComponentType.UNSIGNED_INT:
			return new Uint32Array(resource, start, accessorDef.count * elementSize);
		case GLTF.AccessorComponentType.UNSIGNED_SHORT:
			return new Uint16Array(resource, start, accessorDef.count * elementSize);
		case GLTF.AccessorComponentType.UNSIGNED_BYTE:
			return new Uint8Array(resource, start, accessorDef.count * elementSize);
		case GLTF.AccessorComponentType.SHORT:
			return new Int16Array(resource, start, accessorDef.count * elementSize);
		case GLTF.AccessorComponentType.BYTE:
			return new Int8Array(resource, start, accessorDef.count * elementSize);
		default:
			throw new Error(`Unexpected componentType "${accessorDef.componentType}".`);
	}
}

/**
 * Returns the contents of a sparse accessor, as a typed array.
 * @hidden
 */
function getSparseArray(accessorDef: GLTF.IAccessor, nativeDoc: NativeDocument): TypedArray {
	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const elementSize = Accessor.getElementSize(accessorDef.type);

	let array: TypedArray;
	if (accessorDef.bufferView !== undefined) {
		// TODO(cleanup): Relying to much on ArrayBuffers: requires copying.
		array = getAccessorArray(accessorDef, nativeDoc).slice();
	} else {
		array = new TypedArray(accessorDef.count * elementSize);
	}

	const count = accessorDef.sparse.count;
	const indicesDef = {...accessorDef, ...accessorDef.sparse.indices, count, type: 'SCALAR'};
	const valuesDef = {...accessorDef, ...accessorDef.sparse.values, count};
	const indices = getAccessorArray(indicesDef as GLTF.IAccessor, nativeDoc);
	const values = getAccessorArray(valuesDef, nativeDoc);

	// Override indices given in the sparse data.
	for (let i = 0; i < indicesDef.count; i++) {
		for (let j = 0; j < elementSize; j++) {
			array[indices[i] * elementSize + j] = values[i * elementSize + j];
		}
	}

	return array;
}
