import { getRotation, getScaling, getTranslation } from 'gl-matrix/mat4'
import { GLB_BUFFER, TypedArray, vec3, vec4 } from '../constants';
import { Document } from '../document';
import { NativeDocument } from '../native-document';
import { Accessor, TextureInfo, TextureSampler } from '../properties';
import { FileUtils } from '../utils';

const ComponentTypeToTypedArray = {
	'5120': Int8Array,
	'5121': Uint8Array,
	'5122': Int16Array,
	'5123': Uint16Array,
	'5125': Uint32Array,
	'5126': Float32Array,
};

/** @hidden */
export class GLTFReader {
	public static read(nativeDoc: NativeDocument): Document {
		const {json} = nativeDoc;
		const doc = new Document();

		if (json.asset.version !== '2.0') {
			throw new Error(`Unsupported glTF version: "${json.asset.version}".`);
		}

		/** Buffers. */

		const bufferDefs = json.buffers || [];
		const buffers = bufferDefs.map((bufferDef) => {
			const buffer = doc.createBuffer(bufferDef.name);
			if (bufferDef.uri && bufferDef.uri.indexOf('__') !== 0) {
				buffer.setURI(bufferDef.uri);
			}
			return buffer;
		});

		/** Buffer views. */

		const bufferViewDefs = json.bufferViews || [];
		const bufferViewToBuffer = bufferViewDefs.map((bufferViewDef) => {
			return buffers[bufferViewDef.buffer];
		});

		/** Accessors. */

		// Accessor .count and .componentType properties are inferred dynamically.
		const accessorDefs = json.accessors || [];
		const accessors = accessorDefs.map((accessorDef) => {
			const buffer = bufferViewToBuffer[accessorDef.bufferView];
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
		const textures = imageDefs.map((imageDef) => {
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
		const materials = materialDefs.map((materialDef) => {
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
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setBaseColorTexture(texture);
				setTextureInfo(material.getBaseColorTextureInfo(), textureInfoDef);
				setTextureSampler(material.getBaseColorTextureSampler(), textureInfoDef, nativeDoc);
			}

			if (materialDef.emissiveTexture !== undefined) {
				const textureInfoDef = materialDef.emissiveTexture;
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setEmissiveTexture(texture);
				setTextureInfo(material.getEmissiveTextureInfo(), textureInfoDef);
				setTextureSampler(material.getEmissiveTextureSampler(), textureInfoDef, nativeDoc);
			}

			if (materialDef.normalTexture !== undefined) {
				const textureInfoDef = materialDef.normalTexture;
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setNormalTexture(texture);
				setTextureInfo(material.getNormalTextureInfo(), textureInfoDef);
				setTextureSampler(material.getNormalTextureSampler(), textureInfoDef, nativeDoc);
				if (materialDef.normalTexture.scale !== undefined) {
					material.setNormalScale(materialDef.normalTexture.scale);
				}
			}

			if (materialDef.occlusionTexture !== undefined) {
				const textureInfoDef = materialDef.occlusionTexture;
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setOcclusionTexture(texture);
				setTextureInfo(material.getOcclusionTextureInfo(), textureInfoDef);
				setTextureSampler(material.getOcclusionTextureSampler(), textureInfoDef, nativeDoc);
				if (materialDef.occlusionTexture.strength !== undefined) {
					material.setOcclusionStrength(materialDef.occlusionTexture.strength);
				}
			}

			if (pbrDef.metallicRoughnessTexture !== undefined) {
				const textureInfoDef = pbrDef.metallicRoughnessTexture;
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setMetallicRoughnessTexture(texture);
				setTextureInfo(material.getMetallicRoughnessTextureInfo(), textureInfoDef);
				setTextureSampler(material.getMetallicRoughnessTextureSampler(), textureInfoDef, nativeDoc);
			}

			return material;
		});

		/** Meshes. */

		const meshDefs = json.meshes || [];
		const meshes = meshDefs.map((meshDef) => {
			const mesh = doc.createMesh(meshDef.name);

			meshDef.primitives.forEach((primitiveDef) => {
				const primitive = doc.createPrimitive();

				if (primitiveDef.material !== undefined) {
					primitive.setMaterial(materials[primitiveDef.material]);
				}

				if (primitiveDef.mode !== undefined) {
					primitive.setMode(primitiveDef.mode);
				}

				for (const [semantic, index] of Object.entries(primitiveDef.attributes || {})) {
					primitive.setAttribute(semantic, accessors[index]);
				}

				if (primitiveDef.indices !== undefined) {
					primitive.setIndices(accessors[primitiveDef.indices]);
				}

				// TODO(feat): primitiveDef.targets

				mesh.addPrimitive(primitive);
			})

			// TODO(feat): meshDef.weights

			return mesh;
		});

		/** Skins. */

		const skinDefs = json.skins || [];
		const skins = skinDefs.map((skinDef) => {
			// TODO(feat): skinDef.inverseBindMatrices
			// TODO(feat): skinDef.joints
			// TODO(feat): skinDef.skeleton

			return null;
		});

		/** Cameras. */

		const cameraDefs = json.cameras || [];
		const cameras = cameraDefs.map((cameraDef) => {
			// TODO(feat): cameraDef.type
			// TODO(feat): cameraDef.orthographic
			// TODO(feat): cameraDef.perspective
			return null;
		});

		/** Nodes. */

		const nodeDefs = json.nodes || [];
		const nodes = nodeDefs.map((nodeDef) => {
			const node = doc.createNode(nodeDef.name);

			if (nodeDef.mesh !== undefined) node.setMesh(meshes[nodeDef.mesh]);

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

			// TODO(feat): nodeDef.camera
			// TODO(feat): nodeDef.skin
			// TODO(feat): nodeDef.weights

			return node;
		});
		nodeDefs.map((nodeDef, parentIndex) => {
			const children = nodeDef.children || [];
			children.forEach((childIndex) => nodes[parentIndex].addChild(nodes[childIndex]));
		})

		/** Animations. */

		const animationDefs = json.animations || [];
		const animations = animationDefs.map((animationDef) => {
			// TODO(feat): animationDef.channels
			// TODO(feat): animationDef.samplers

			return null;
		});

		/** Scenes. */

		const sceneDefs = json.scenes || [];
		const scenes = sceneDefs.map((sceneDef) => {
			const scene = doc.createScene(sceneDef.name);

			const children = sceneDef.nodes || [];

			children
			.map((nodeIndex) => nodes[nodeIndex])
			.forEach((node) => (scene.addNode(node)));

			return scene;
		});

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
