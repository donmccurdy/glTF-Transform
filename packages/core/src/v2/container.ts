import { Graph, Root, Node, Scene, Texture, Material, Mesh, Accessor, Primitive, TypedArray } from "./elements";
import { IBufferMap } from "../container";
import { Vector3, Vector4 } from "./math";
import { AccessorTypeData, AccessorComponentType } from "../core";

export class Container {
  private graph: Graph = new Graph();
  private root: Root = new Root(this.graph);

  public getRoot(): Root {
    return this.root;
  }

  public clone(): Container {
    throw new Error('Not implemented.');
  }

  /* Container factory methods */

  static fromGLTF_v2(json: GLTF.IGLTF, resources: IBufferMap): Container {
    const container = new Container();

    // Accessor .count and .componentType properties are inferred dynamically.
    const accessorDefs = json.accessors || [];
    const accessors = accessorDefs.map((accessorDef, index) => {
      const accessor = container.createAccessor(accessorDef.name);

      if (accessorDef.sparse !== undefined) {
        // TODO(donmccurdy): Support accessorDef.sparse.
        throw new Error('Sparse accessors not yet implemented.')
      }

      if (accessorDef.normalized !== undefined) {
        // TODO(donmccurdy): Support accessorDef.normalized.
        throw new Error('Normalized accessors not yet implemented.');
      }

      accessor.setType(accessorDef.type);
      accessor.setArray(getAccessorArray(index, json, resources));

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

    const animationDefs = json.animations || [];
    const animations = animationDefs.map((animationDef) => {
      // TODO(donmccurdy): animationDef.channels
      // TODO(donmccurdy): animationDef.samplers

      return null;
    });

    const sceneDefs = json.scenes || [];
    const scenes = sceneDefs.map((sceneDef) => {
      const scene = container.createScene(sceneDef.name);

      (sceneDef.nodes || [])
      .map((nodeIndex) => nodes[nodeIndex])
      .forEach((node) => (scene.addNode(node)));

      return scene;
    });

    return container;
  }

  /* Element factory methods. */

  createScene(name: string): Scene {
    const scene = new Scene(this.graph, name);
    this.root.addScene(scene);
    return scene;
  }
  createNode(name: string): Node {
    const node = new Node(this.graph, name);
    this.root.addNode(node);
    return node;
  }
  createMesh(name: string): Mesh {
    const mesh = new Mesh(this.graph, name);
    this.root.addMesh(mesh);
    return mesh;
  }
  createPrimitive(/*name: string*/): Primitive {
    const primitive = new Primitive(this.graph/*, name*/);
    // this.root.addPrimitive(primitive);
    return primitive;
  }
  createMaterial(name: string): Material {
    const material = new Material(this.graph, name);
    this.root.addMaterial(material);
    return material;
  }
  createTexture(name: string): Texture {
    const texture = new Texture(this.graph, name);
    this.root.addTexture(texture);
    return texture;
  }
  createAccessor(name: string): Accessor {
    const accessor = new Accessor(this.graph, name);
    this.root.addAccessor(accessor);
    return accessor;
  }
}

/**
* Returns the accessor for the given index, as a typed array.
* @param index
*/
function getAccessorArray(index: number, json: GLTF.IGLTF, resources: IBufferMap): TypedArray {
  const accessor = json.accessors[index];
  const bufferView = json.bufferViews[accessor.bufferView];
  const buffer = json.buffers[bufferView.buffer];
  const resource = resources[buffer.uri];

  const itemSize = AccessorTypeData[accessor.type].size;
  const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);

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