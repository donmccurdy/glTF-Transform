import { AccessorComponentType, AccessorTypeData, ComponentTypeToTypedArray, GLB_BUFFER, NOT_IMPLEMENTED, TypedArray } from '../constants';
import { Container } from '../container';
import { Vector3, Vector4 } from '../math';
import { Asset } from './asset';

/** Returns the contents of an interleaved accessor, as a typed array. */
function getInterleavedArray(accessorDef: GLTF.IAccessor, asset: Asset): TypedArray {
	const bufferView = asset.json.bufferViews[accessorDef.bufferView];
	const buffer = asset.json.buffers[bufferView.buffer];
	const resource = buffer.uri ? asset.resources[buffer.uri] : asset.resources[GLB_BUFFER];

	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const itemSize = AccessorTypeData[accessorDef.type].size;
	const valueSize = TypedArray.BYTES_PER_ELEMENT;
	const accessorByteOffset = accessorDef.byteOffset || 0;

	const array = new TypedArray(accessorDef.count * itemSize);
	const view = new DataView(resource, bufferView.byteOffset, bufferView.byteLength);
	const byteStride = bufferView.byteStride;

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
	const bufferView = asset.json.bufferViews[accessorDef.bufferView];
	const buffer = asset.json.buffers[bufferView.buffer];
	const resource = buffer.uri ? asset.resources[buffer.uri] : asset.resources[GLB_BUFFER];

	const TypedArray = ComponentTypeToTypedArray[accessorDef.componentType];
	const itemSize = AccessorTypeData[accessorDef.type].size;
	const valueSize = TypedArray.BYTES_PER_ELEMENT;
	const itemStride = itemSize * valueSize;

	// Interleaved buffer view.
	if (bufferView.byteStride !== undefined && bufferView.byteStride !==  itemStride) {
		return getInterleavedArray(accessorDef, asset);
	}

	const start = (bufferView.byteOffset || 0) + (accessorDef.byteOffset || 0);

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

export class GLTFReader {
	public static read(asset: Asset): Container {
		const {json} = asset;
		const container = new Container();

		const bufferDefs = json.buffers || [];
		const buffers = bufferDefs.map((bufferDef) => container.createBuffer(bufferDef.name));

		const bufferViewDefs = json.bufferViews || [];
		const bufferViewToBuffer = bufferViewDefs.map((bufferViewDef) => {
			return buffers[bufferViewDef.buffer];
		});

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
				// TODO(donmccurdy): Support accessorDef.normalized. Unpack this?
				// accessor.setNormalized(accessorDef.normalized === true);
				throw new Error('Normalized accessors not yet implemented.');
			}

			accessor.setArray(array);
			return accessor;
		});

		const textureDefs = json.textures || [];
		const textures = textureDefs.map((textureDef) => {
			const texture = container.createTexture(textureDef.name);

			// TODO(donmccurdy): textureDef.sampler
			// TODO(donmccurdy): textureDef.source

			// const imageDef = json.images[textureDef.source];
			// TODO(donmccurdy): imageDef.bufferView
			// TODO(donmccurdy): imageDef.mimeType
			// TODO(donmccurdy): imageDef.uri

			return texture;
		});

		const materialDefs = json.materials || [];
		const materials = materialDefs.map((materialDef) => {
			const material = container.createMaterial(materialDef.name);

			if (materialDef.alphaMode !== undefined) {
				material.setAlphaMode(materialDef.alphaMode);
			}

			if (materialDef.alphaCutoff !== undefined) {
				material.setAlphaCutoff(materialDef.alphaCutoff);
			}

			if (materialDef.doubleSided !== undefined) {
				material.setDoubleSided(materialDef.doubleSided);
			}

			if (materialDef.pbrMetallicRoughness.baseColorFactor !== undefined) {
				material.setBaseColorFactor(
					new Vector4(...materialDef.pbrMetallicRoughness.baseColorFactor)
				);
			}

			if (materialDef.emissiveFactor !== undefined) {
				material.setEmissiveFactor(new Vector3(...materialDef.emissiveFactor));
			}

			if (materialDef.pbrMetallicRoughness.baseColorTexture !== undefined) {
				const baseColorTextureInfo = materialDef.pbrMetallicRoughness.baseColorTexture;
				const baseColorTextureSamplerIndex = json.textures[baseColorTextureInfo.index].sampler;

				// TODO(donmccurdy): Need to store texCoord and possibly transform.
				material.setBaseColorTexture(textures[baseColorTextureInfo.index]);

				const textureInfo = material.getBaseColorTextureInfo();

				if (baseColorTextureInfo.texCoord !== undefined) {
					textureInfo.setTexCoord(baseColorTextureInfo.texCoord);
				}

				// TODO(donmccurdy): Move this to shared function.
				if (baseColorTextureSamplerIndex !== undefined) {
					const samplerDef = json.samplers[baseColorTextureSamplerIndex];
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
			}

			if (materialDef.emissiveTexture !== undefined) {
				const emissiveTextureInfo = materialDef.emissiveTexture;
				// TODO(donmccurdy): Need to store texCoord and possibly transform.
				material.setEmissiveTexture(textures[emissiveTextureInfo.index]);
			}

			// TODO(donmccurdy): materialDef.normalTexture
			// TODO(donmccurdy): materialDef.occlusionTexture
			// TODO(donmccurdy): materialDef.pbrMetallicRoughness.metallicFactor
			// TODO(donmccurdy): materialDef.pbrMetallicRoughness.roughnessFactor
			// TODO(donmccurdy): materialDef.pbrMetallicRoughness.metallicRoughnessTexture

			return material;
		});

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

		const skinDefs = json.skins || [];
		const skins = skinDefs.map((skinDef) => {
			// TODO(donmccurdy): skinDef.inverseBindMatrices
			// TODO(donmccurdy): skinDef.joints
			// TODO(donmccurdy): skinDef.skeleton

			return null;
		});

		const cameraDefs = json.cameras || [];
		const cameras = cameraDefs.map((cameraDef) => {
			// TODO(donmccurdy): cameraDef.type
			// TODO(donmccurdy): cameraDef.orthographic
			// TODO(donmccurdy): cameraDef.perspective
			return null;
		});

		const nodeDefs = json.nodes || [];
		const nodes = nodeDefs.map((nodeDef) => {
			const node = container.createNode(nodeDef.name);

			if (nodeDef.mesh !== undefined) node.setMesh(meshes[nodeDef.mesh]);

			if (nodeDef.translation !== undefined) {
				node.setTranslation(new Vector3(...nodeDef.translation));
			}

			if (nodeDef.rotation !== undefined) {
				node.setRotation(new Vector4(...nodeDef.rotation));
			}

			if (nodeDef.scale !== undefined) {
				node.setScale(new Vector3(...nodeDef.scale));
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

		const animationDefs = json.animations || [];
		const animations = animationDefs.map((animationDef) => {
			// TODO(donmccurdy): animationDef.channels
			// TODO(donmccurdy): animationDef.samplers

			return null;
		});

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
