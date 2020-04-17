import { AccessorComponentType, AccessorTypeData, ComponentTypeToTypedArray, GLB_BUFFER, TypedArray, vec3, vec4 } from '../constants';
import { Container } from '../container';
import { TextureInfo } from '../elements';
import { FileUtils } from '../utils';
import { Asset } from './asset';

export class GLTFReader {
	public static read(asset: Asset): Container {
		const {json} = asset;
		const container = new Container();

		if (json.asset.version !== '2.0') {
			throw new Error(`Unsupported glTF version: "${json.asset.version}".`);
		}

		/** Buffers. */

		const bufferDefs = json.buffers || [];
		const buffers = bufferDefs.map((bufferDef) => container.createBuffer(bufferDef.name));

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
			const accessor = container.createAccessor(accessorDef.name, buffer);
			accessor.setType(accessorDef.type);

			let array: TypedArray;

			if (accessorDef.sparse !== undefined) {
				array = getSparseArray(accessorDef, asset);
			} else {
				// TODO(donmccurdy): Just making a copy here, like a barbarian.
				array = getAccessorArray(accessorDef, asset).slice();
			}

			if (accessorDef.normalized !== undefined) {
				accessor.setNormalized(accessorDef.normalized);
			}

			accessor.setArray(array);
			return accessor;
		});

		/** Textures. */

		// glTF-Transform's "Texture" elements correspond 1:1 with glTF "Image" properties, and
		// with image files. The glTF file may contain more one texture per image, where images
		// are reused with different sampler properties.
		const imageDefs = json.images || [];
		const textureDefs = json.textures || [];
		const textures = imageDefs.map((imageDef) => {
			const texture = container.createTexture(imageDef.name);

			if (imageDef.bufferView !== undefined) {
				const bufferViewDef = json.bufferViews[imageDef.bufferView];
				const bufferDef = asset.json.buffers[bufferViewDef.buffer];
				const bufferData = bufferDef.uri
					? asset.resources[bufferDef.uri]
					: asset.resources[GLB_BUFFER];
				const byteOffset = bufferViewDef.byteOffset || 0;
				const imageData = bufferData.slice(byteOffset, bufferViewDef.byteLength);
				texture.setImage(imageData);
			} else if (imageDef.uri !== undefined) {
				texture.setImage(asset.resources[imageDef.uri]);
				texture.setURI(imageDef.uri);
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
			const material = container.createMaterial(materialDef.name);

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
				setTextureInfo(material.getBaseColorTextureInfo(), textureInfoDef, asset);
			}

			if (materialDef.emissiveTexture !== undefined) {
				const textureInfoDef = materialDef.emissiveTexture;
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setEmissiveTexture(texture);
				setTextureInfo(material.getEmissiveTextureInfo(), textureInfoDef, asset);
			}

			if (materialDef.normalTexture !== undefined) {
				const textureInfoDef = materialDef.normalTexture;
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setNormalTexture(texture);
				setTextureInfo(material.getNormalTextureInfo(), textureInfoDef, asset);
				if (materialDef.normalTexture.scale !== undefined) {
					material.setNormalScale(materialDef.normalTexture.scale);
				}
			}

			if (materialDef.occlusionTexture !== undefined) {
				const textureInfoDef = materialDef.occlusionTexture;
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setOcclusionTexture(texture);
				setTextureInfo(material.getOcclusionTextureInfo(), textureInfoDef, asset);
				if (materialDef.occlusionTexture.strength !== undefined) {
					material.setOcclusionStrength(materialDef.occlusionTexture.strength);
				}
			}

			if (pbrDef.metallicRoughnessTexture !== undefined) {
				const textureInfoDef = pbrDef.metallicRoughnessTexture;
				const texture = textures[textureDefs[textureInfoDef.index].source];
				material.setMetallicRoughnessTexture(texture);
				setTextureInfo(material.getMetallicRoughnessTextureInfo(), textureInfoDef, asset);
			}

			return material;
		});

		/** Meshes. */

		const meshDefs = json.meshes || [];
		const meshes = meshDefs.map((meshDef) => {
			const mesh = container.createMesh(meshDef.name);

			meshDef.primitives.forEach((primitiveDef) => {
				const primitive = container.createPrimitive();

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

				// TODO(donmccurdy): primitiveDef.targets

				mesh.addPrimitive(primitive);
			})

			// TODO(donmccurdy): meshDef.weights

			return mesh;
		});

		/** Skins. */

		const skinDefs = json.skins || [];
		const skins = skinDefs.map((skinDef) => {
			// TODO(donmccurdy): skinDef.inverseBindMatrices
			// TODO(donmccurdy): skinDef.joints
			// TODO(donmccurdy): skinDef.skeleton

			return null;
		});

		/** Cameras. */

		const cameraDefs = json.cameras || [];
		const cameras = cameraDefs.map((cameraDef) => {
			// TODO(donmccurdy): cameraDef.type
			// TODO(donmccurdy): cameraDef.orthographic
			// TODO(donmccurdy): cameraDef.perspective
			return null;
		});

		/** Nodes. */

		const nodeDefs = json.nodes || [];
		const nodes = nodeDefs.map((nodeDef) => {
			const node = container.createNode(nodeDef.name);

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

			// TODO(donmccurdy): nodeDef.matrix
			// TODO(donmccurdy): nodeDef.camera
			// TODO(donmccurdy): nodeDef.skin
			// TODO(donmccurdy): nodeDef.weights

			return node;
		});
		nodeDefs.map((nodeDef, parentIndex) => {
			const children = nodeDef.children || [];
			children.forEach((childIndex) => nodes[parentIndex].addChild(nodes[childIndex]));
		})

		/** Animations. */

		const animationDefs = json.animations || [];
		const animations = animationDefs.map((animationDef) => {
			// TODO(donmccurdy): animationDef.channels
			// TODO(donmccurdy): animationDef.samplers

			return null;
		});

		/** Scenes. */

		const sceneDefs = json.scenes || [];
		const scenes = sceneDefs.map((sceneDef) => {
			const scene = container.createScene(sceneDef.name);

			const children = sceneDef.nodes || [];

			children
			.map((nodeIndex) => nodes[nodeIndex])
			.forEach((node) => (scene.addNode(node)));

			return scene;
		});

		return container;
	}
}

// eslint-disable-next-line max-len
function setTextureInfo(textureInfo: TextureInfo, textureInfoDef: GLTF.ITextureInfo, asset: Asset): void {
	if (textureInfoDef.texCoord !== undefined) {
		textureInfo.setTexCoord(textureInfoDef.texCoord);
	}

	const textureDef = asset.json.textures[textureInfoDef.index];

	if (textureDef.sampler === undefined) return;

	const samplerDef = asset.json.samplers[textureDef.sampler];

	if (samplerDef.magFilter !== undefined) {
		textureInfo.setMagFilter(samplerDef.magFilter);
	}
	if (samplerDef.minFilter !== undefined) {
		textureInfo.setMinFilter(samplerDef.minFilter);
	}
	if (samplerDef.wrapS !== undefined) {
		textureInfo.setWrapS(samplerDef.wrapS);
	}
	if (samplerDef.wrapT !== undefined) {
		textureInfo.setWrapT(samplerDef.wrapT);
	}
}

/** Returns the contents of an interleaved accessor, as a typed array. */
function getInterleavedArray(accessorDef: GLTF.IAccessor, asset: Asset): TypedArray {
	const bufferViewDef = asset.json.bufferViews[accessorDef.bufferView];
	const bufferDef = asset.json.buffers[bufferViewDef.buffer];
	const resource = bufferDef.uri ? asset.resources[bufferDef.uri] : asset.resources[GLB_BUFFER];

	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const itemSize = AccessorTypeData[accessorDef.type].size;
	const valueSize = TypedArray.BYTES_PER_ELEMENT;
	const accessorByteOffset = accessorDef.byteOffset || 0;

	const array = new TypedArray(accessorDef.count * itemSize);
	const view = new DataView(resource, bufferViewDef.byteOffset, bufferViewDef.byteLength);
	const byteStride = bufferViewDef.byteStride;

	for (let i = 0; i < accessorDef.count; i++) {
		for (let j = 0; j < itemSize; j++) {
			const byteOffset = accessorByteOffset + i * byteStride + j * valueSize;
			let value: number;
			switch (accessorDef.componentType) {
				case AccessorComponentType.FLOAT:
					value = view.getFloat32(byteOffset, true);
					break;
				case AccessorComponentType.UNSIGNED_INT:
					value = view.getUint32(byteOffset, true);
					break;
				case AccessorComponentType.UNSIGNED_SHORT:
					value = view.getUint16(byteOffset, true);
					break;
				case AccessorComponentType.UNSIGNED_BYTE:
					value = view.getUint8(byteOffset);
					break;
				case AccessorComponentType.SHORT:
					value = view.getInt16(byteOffset, true);
					break;
				case AccessorComponentType.BYTE:
					value = view.getInt8(byteOffset);
					break;
				default:
				throw new Error(`Unexpected componentType "${accessorDef.componentType}".`);
			}
			array[i * itemSize + j] = value;
		}
	}

	return array;
}

/** Returns the contents of an accessor, as a typed array. */
function getAccessorArray(accessorDef: GLTF.IAccessor, asset: Asset): TypedArray {
	const bufferViewDef = asset.json.bufferViews[accessorDef.bufferView];
	const bufferDef = asset.json.buffers[bufferViewDef.buffer];
	const resource = bufferDef.uri ? asset.resources[bufferDef.uri] : asset.resources[GLB_BUFFER];

	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const itemSize = AccessorTypeData[accessorDef.type].size;
	const valueSize = TypedArray.BYTES_PER_ELEMENT;
	const itemStride = itemSize * valueSize;

	// Interleaved buffer view.
	if (bufferViewDef.byteStride !== undefined && bufferViewDef.byteStride !==  itemStride) {
		return getInterleavedArray(accessorDef, asset);
	}

	const start = (bufferViewDef.byteOffset || 0) + (accessorDef.byteOffset || 0);

	switch (accessorDef.componentType) {
		case AccessorComponentType.FLOAT:
			return new Float32Array(resource, start, accessorDef.count * itemSize);
		case AccessorComponentType.UNSIGNED_INT:
			return new Uint32Array(resource, start, accessorDef.count * itemSize);
		case AccessorComponentType.UNSIGNED_SHORT:
			return new Uint16Array(resource, start, accessorDef.count * itemSize);
		case AccessorComponentType.UNSIGNED_BYTE:
			return new Uint8Array(resource, start, accessorDef.count * itemSize);
		case AccessorComponentType.SHORT:
			return new Int16Array(resource, start, accessorDef.count * itemSize);
		case AccessorComponentType.BYTE:
			return new Int8Array(resource, start, accessorDef.count * itemSize);
		default:
			throw new Error(`Unexpected componentType "${accessorDef.componentType}".`);
	}
}

/** Returns the contents of a sparse accessor, as a typed array. */
function getSparseArray(accessorDef: GLTF.IAccessor, asset: Asset): TypedArray {
	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const itemSize = AccessorTypeData[accessorDef.type].size;

	let array: TypedArray;
	if (accessorDef.bufferView !== undefined) {
		array = getAccessorArray(accessorDef, asset);
	} else {
		array = new TypedArray(accessorDef.count * itemSize);
	}

	const count = accessorDef.sparse.count;
	const indicesDef = {...accessorDef, ...accessorDef.sparse.indices, count, type: 'SCALAR'};
	const valuesDef = {...accessorDef, ...accessorDef.sparse.values, count};
	const indices = getAccessorArray(indicesDef as GLTF.IAccessor, asset);
	const values = getAccessorArray(valuesDef, asset);

	// Override indices given in the sparse data.
	for (let i = 0; i < indicesDef.count; i++) {
		for (let j = 0; j < itemSize; j++) {
			array[indices[i] * itemSize + j] = values[i * itemSize + j];
		}
	}

	return array;
}
