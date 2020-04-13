import { AccessorComponentTypeData, AccessorTypeData, BufferViewTarget, GLB_BUFFER } from '../constants';
import { Container } from '../container';
import { Accessor, AttributeLink, Buffer, Element, IndexLink, Material, Mesh, Node, Primitive, Root, Texture } from '../elements/index';
import { Link } from '../graph/index';
import { GLTFUtil } from '../util';
import { Asset } from './asset';

type ElementDef = GLTF.IScene | GLTF.INode | GLTF.IMaterial | GLTF.ISkin | GLTF.ITexture;

// TODO(donmccurdy): Not sure what this test error is:
// (node:60004) [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability
// issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.

function createElementDef(element: Element): ElementDef {
	const def = {} as ElementDef;
	if (element.getName()) {
		def.name = element.getName();
	}
	if (Object.keys(element.getExtras()).length > 0) {
		def.extras = element.getExtras();
	}
	if (Object.keys(element.getExtensions()).length > 0) {
		def.extras = element.getExtensions();
	}
	return def;
}

function createAccessorDef(accessor: Accessor): GLTF.IAccessor {
	const accessorDef = createElementDef(accessor) as GLTF.IAccessor;
	accessorDef.type = accessor.getType();
	accessorDef.componentType = accessor.getComponentType();
	accessorDef.count = accessor.getCount();
	accessorDef.max = accessor.getMax();
	accessorDef.min = accessor.getMin();
	// TODO(donmccurdy): accessorDef.normalized
	return accessorDef;
}

/**
* Removes empty and null values from an object.
* @param object
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

export interface WriterOptions {
	basename: string;
	isGLB: boolean;
}

export class GLTFWriter {
	public static write(container: Container, options: WriterOptions): Asset {
		const root = container.getRoot();
		const asset = {json: {asset: root.getAsset()}, resources: {}} as Asset;
		const json = asset.json;

		/* Index lookup. */

		const bufferIndexMap = new Map<Buffer, number>();
		const accessorIndexMap = new Map<Accessor, number>();
		const materialIndexMap = new Map<Material, number>();
		const meshIndexMap = new Map<Mesh, number>();
		const nodeIndexMap = new Map<Node, number>();
		const textureIndexMap = new Map<Texture, number>();

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
				const accessorDef = createAccessorDef(accessor);
				accessorDef.bufferView = json.bufferViews.length;
				// TODO(donmccurdy): accessorDef.sparse

				const data = GLTFUtil.pad(accessor.getArray().buffer);
				accessorDef.byteOffset = byteLength;
				byteLength += data.byteLength;
				buffers.push(data);

				accessorIndexMap.set(accessor, json.accessors.length);
				json.accessors.push(accessorDef);
			}

			// Create buffer view definition.
			const bufferViewData = GLTFUtil.concat(buffers);
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
				const accessorDef = createAccessorDef(accessor);
				accessorDef.bufferView = json.bufferViews.length;
				accessorDef.byteOffset = byteStride;

				const itemSize = AccessorTypeData[accessor.getType()].size;
				const valueSize = AccessorComponentTypeData[accessor.getComponentType()].size;
				byteStride += GLTFUtil.padNumber(itemSize * valueSize);

				accessorIndexMap.set(accessor, json.accessors.length);
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
					const itemSize = AccessorTypeData[accessor.getType()].size;
					const valueSize = AccessorComponentTypeData[accessor.getComponentType()].size;
					const componentType = accessor.getComponentType();
					const array = accessor.getArray();
					for (let j = 0; j < itemSize; j++) {
						const viewByteOffset = i * byteStride + vertexByteOffset + j * valueSize;
						const value = array[i * itemSize + j];
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
					vertexByteOffset += GLTFUtil.padNumber(itemSize * valueSize);
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

		const accessorLinks = new Map<Accessor, Link<Element, Accessor>[]>();

		// Gather all accessors, creating a map to look up their uses.
		for (const link of container.getGraph().getLinks()) {
			if (link.getLeft() === root) continue;

			const child = link.getRight();

			if (child instanceof Accessor) {
				const uses = accessorLinks.get(child) || [];
				uses.push(link as Link<Element, Accessor>);
				accessorLinks.set(child, uses);
			}
		}

		/* Buffers, buffer views, and accessors. */

		json.accessors = [];
		json.bufferViews = [];
		json.buffers = root.listBuffers().map((buffer, bufferIndex) => {
			const bufferDef = createElementDef(buffer) as GLTF.IBuffer;

			// Attributes are grouped and interleaved in one buffer view per mesh primitive. Indices for
			// all primitives are grouped into a single buffer view. Everything else goes into a
			// miscellaneous buffer view.
			const attributeAccessors = new Map<Primitive, Set<Accessor>>();
			const indexAccessors = new Set<Accessor>();
			const otherAccessors = new Set<Accessor>();

			const bufferParents = container.getGraph()
			.listParentElements(buffer)
			.filter((element) => !(element instanceof Root)) as Element[];

			// Categorize accessors by use.
			for (const parent of bufferParents) {
				if ((!(parent instanceof Accessor))) { // Texture
					throw new Error('Unimplemented buffer reference: ');
				}

				let isAttribute = false;
				let isIndex = false;
				let isOther = false;

				const accessorRefs = accessorLinks.get(parent);
				for (const link of accessorRefs) {
					if (link instanceof AttributeLink) {
						isAttribute = true;
					} else if (link instanceof IndexLink) {
						isIndex = true;
					} else {
						isOther = true;
					}
				}

				if (isAttribute && !isIndex && !isOther) {
					const primitive = accessorRefs[0].getLeft() as Primitive;
					const primitiveAccessors = attributeAccessors.get(primitive) || new Set<Accessor>();
					primitiveAccessors.add(parent);
					attributeAccessors.set(primitive, primitiveAccessors);
				} else if (isIndex && !isAttribute && !isOther) {
					indexAccessors.add(parent);
				} else if (isOther && !isAttribute && !isIndex) {
					otherAccessors.add(parent);
				} else {
					throw new Error('Attribute or index accessors must be used only for that purpose.');
				}
			}

			// Write accessor groups to buffer views.

			const buffers: ArrayBuffer[] = [];
			let bufferByteLength = 0;

			if (indexAccessors.size) {
				const indexResult = concatAccessors(Array.from(indexAccessors), bufferIndex, bufferByteLength, BufferViewTarget.ELEMENT_ARRAY_BUFFER);
				bufferByteLength += indexResult.byteLength;
				buffers.push(...indexResult.buffers);
			}

			for (const primitiveAccessors of attributeAccessors.values()) {
				if (primitiveAccessors.size) {
					const primitiveResult = interleaveAccessors(Array.from(primitiveAccessors), bufferIndex, bufferByteLength);
					bufferByteLength += primitiveResult.byteLength;
					buffers.push(...primitiveResult.buffers);
				}
			}

			if (otherAccessors.size) {
				const otherResult = concatAccessors(Array.from(otherAccessors), bufferIndex, bufferByteLength);
				bufferByteLength += otherResult.byteLength;
				buffers.push(...otherResult.buffers);
			}


			// Assign buffer URI.

			let uri: string;
			if (options.isGLB) {
				uri = GLB_BUFFER;
			} else if (buffer.getURI()) {
				uri = buffer.getURI();
			} else if (root.listBuffers().length === 1) {
				uri = `${options.basename}.bin`;
			} else {
				uri = `${options.basename}_${bufferIndex}.bin`;
			}
			if (!options.isGLB) bufferDef.uri = uri;

			// Write buffer views to buffer.

			bufferDef.byteLength = bufferByteLength;
			asset.resources[uri] = GLTFUtil.concat(buffers);

			bufferIndexMap.set(buffer, bufferIndex);
			return bufferDef;
		});

		/* Textures. */

		/* Materials. */

		json.materials = root.listMaterials().map((material, index) => {
			const materialDef = createElementDef(material) as GLTF.IMaterial;
			materialDef.alphaMode = material.getAlphaMode();
			materialDef.alphaCutoff = material.getAlphaCutoff();
			materialDef.doubleSided = material.getDoubleSided();
			materialDef.pbrMetallicRoughness = {};
			materialDef.pbrMetallicRoughness.baseColorFactor = material.getBaseColorFactor().toArray();
			materialDef.emissiveFactor = material.getEmissiveFactor().toArray();
			// TODO(donmccurdy): materialDef.emissiveTexture
			// TODO(donmccurdy): materialDef.normalTexture
			// TODO(donmccurdy): materialDef.occlusionTexture
			// TODO(donmccurdy): materialDef.pbrMetallicRoughness.baseColorTexture
			// TODO(donmccurdy): materialDef.pbrMetallicRoughness.metallicFactor
			// TODO(donmccurdy): materialDef.pbrMetallicRoughness.roughnessFactor
			// TODO(donmccurdy): materialDef.pbrMetallicRoughness.metallicRoughnessTexture

			materialIndexMap.set(material, index);
			return materialDef;
		});

		/* Meshes. */

		json.meshes = root.listMeshes().map((mesh, index) => {
			const meshDef = createElementDef(mesh) as GLTF.IMesh;
			meshDef.primitives = mesh.listPrimitives().map((primitive) => {
				const primitiveDef: GLTF.IMeshPrimitive = {attributes: {}};
				primitiveDef.material = materialIndexMap.get(primitive.getMaterial());
				primitiveDef.mode = primitive.getMode();

				if (primitive.getIndices()) {
					primitiveDef.indices = accessorIndexMap.get(primitive.getIndices());
				}

				for (const semantic of primitive.listSemantics()) {
					primitiveDef.attributes[semantic] = accessorIndexMap.get(primitive.getAttribute(semantic));
				}

				// TODO(donmccurdy): .targets
				// TODO(donmccurdy): .targetNames

				return primitiveDef;
			});

			// TODO(donmccurdy): meshDef.weights

			meshIndexMap.set(mesh, index);
			return meshDef;
		});

		/* Nodes. */

		json.nodes = root.listNodes().map((node, index) => {
			const nodeDef = createElementDef(node) as GLTF.INode;
			nodeDef.translation = node.getTranslation().toArray();
			nodeDef.rotation = node.getRotation().toArray();
			nodeDef.scale = node.getScale().toArray();

			if (node.getMesh()) {
				nodeDef.mesh = meshIndexMap.get(node.getMesh());
			}

			// node.weights
			// node.light
			// node.camera

			nodeIndexMap.set(node, index);
			return nodeDef;
		});
		root.listNodes().forEach((node, index) => {
			if (node.listChildren().length === 0) return;

			const nodeDef = json.nodes[index];
			nodeDef.children = node.listChildren().map((node) => nodeIndexMap.get(node));
		});

		/* Scenes. */

		json.scenes = root.listScenes().map((scene) => {
			const sceneDef = createElementDef(scene) as GLTF.IScene;
			sceneDef.nodes = scene.listNodes().map((node) => nodeIndexMap.get(node));
			return sceneDef;
		});

		//

		clean(json);

		return asset;
	}
}
