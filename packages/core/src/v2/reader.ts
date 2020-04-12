import { AccessorComponentType, AccessorTypeData } from "../constants";
import { TypedArray } from "../constants";
import { Vector3, Vector4 } from "../math";
import { IBufferMap } from "../v1/container";
import { Container } from "./container";

export class GLTFReader {
  public static read(json: GLTF.IGLTF, resources: IBufferMap): Container {
    const container = new Container();

    const bufferDefs = json.buffers || [];
    const buffers = bufferDefs.map((bufferDef) => container.createBuffer(bufferDef.name));

    const bufferViewDefs = json.bufferViews || [];
    const bufferViewToBuffer = bufferViewDefs.map((bufferViewDef) => buffers[bufferViewDef.buffer]);

    // Accessor .count and .componentType properties are inferred dynamically.
    const accessorDefs = json.accessors || [];
    const accessors = accessorDefs.map((accessorDef, index) => {
      const buffer = bufferViewToBuffer[accessorDef.bufferView];
      const accessor = container.createAccessor(accessorDef.name, buffer);

      if (accessorDef.sparse !== undefined) {
        // TODO(donmccurdy): Support accessorDef.sparse. Unpack this.
        // accessor.setSparse(accessorDef.sparse === true);
        throw new Error('Sparse accessors not yet implemented.')
      }

      if (accessorDef.normalized !== undefined) {
        // TODO(donmccurdy): Support accessorDef.normalized. Unpack this?
        // accessor.setNormalized(accessorDef.normalized === true);
        throw new Error('Normalized accessors not yet implemented.');
      }

      // TODO(donmccurdy): Just making a copy here, like a barbarian.
      accessor.setType(accessorDef.type);
      accessor.setArray(getAccessorArray(index, json, resources).slice());

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
        material.setBaseColorFactor(new Vector4(...materialDef.pbrMetallicRoughness.baseColorFactor));
      }

      if (materialDef.emissiveFactor !== undefined) {
        material.setEmissiveFactor(new Vector3(...materialDef.emissiveFactor));
      }

      if (materialDef.pbrMetallicRoughness.baseColorTexture !== undefined) {
        const baseColorTextureInfo = materialDef.pbrMetallicRoughness.baseColorTexture;
        // TODO(donmccurdy): Need to store texCoord and possibly transform.
        material.setBaseColorTexture(textures[baseColorTextureInfo.index]);
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

/**
* Returns the accessor for the given index, as a typed array.
* @param index
*/
function getAccessorArray(index: number, json: GLTF.IGLTF, resources: IBufferMap): TypedArray {
  // TODO(donmccurdy): This is not at all robust. For a complete implementation, see:
  // https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/GLTFLoader.js#L1720

  const accessor = json.accessors[index];
  const bufferView = json.bufferViews[accessor.bufferView];
  const buffer = json.buffers[bufferView.buffer];
  const resource = resources[buffer.uri];

  const itemSize = AccessorTypeData[accessor.type].size;
  const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);

  bufferView.byteStride

  switch (accessor.componentType) {
    case AccessorComponentType.FLOAT:
      return new Float32Array(resource, start, accessor.count * itemSize);
    case AccessorComponentType.UNSIGNED_INT:
      return new Uint32Array(resource, start, accessor.count * itemSize);
    case AccessorComponentType.UNSIGNED_SHORT:
      return new Uint16Array(resource, start, accessor.count * itemSize);
    case AccessorComponentType.UNSIGNED_BYTE:
      return new Uint8Array(resource, start, accessor.count * itemSize);
    default:
      throw new Error(`Accessor componentType ${accessor.componentType} not implemented.`);
  }
};
