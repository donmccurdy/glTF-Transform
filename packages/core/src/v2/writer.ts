import { Accessor } from "../elements/accessor";
import { Container } from "./container";
import { Element } from "../elements/element";
import { IBufferMap } from "../v1/container";
import { Material } from "../elements/material";
import { Node } from "../elements/node";
import { Texture } from "../elements/texture";

type ElementDef = GLTF.IScene | GLTF.INode | GLTF.IMaterial | GLTF.ISkin | GLTF.ITexture;

export class GLTFWriter {
  public static write(container: Container): {json: GLTF.IGLTF, resources: IBufferMap} {
    const root = container.getRoot();
    const json: GLTF.IGLTF = {asset: root.getAsset()};
    const resources = {} as IBufferMap;

    /* Shared resources. */

    // const bufferViews = [];
    // const buffers = [];

    const accessorIndexMap = new Map<Accessor, number>();
    const materialIndexMap = new Map<Material, number>();
    const nodeIndexMap = new Map<Node, number>();
    const textureIndexMap = new Map<Texture, number>();

    /* Accessors. */

    // root.listAccessors()
    //     .forEach((accessor) => {
    //         // TODO(donmccurdy): Write.
    //     });

    /* Textures. */

    /* Materials. */

    json.materials = root.listMaterials().map((material, index) => {
      const materialDef = createElementDef(material) as GLTF.IMaterial;
      materialDef.alphaMode = material.getAlphaMode();
      materialDef.alphaCutoff = material.getAlphaCutoff();
      materialDef.doubleSided = material.getDoubleSided();
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

    /* Nodes. */

    json.nodes = root.listNodes().map((node, index) => {
      const nodeDef = createElementDef(node) as GLTF.INode;
      nodeDef.translation = node.getTranslation().toArray();
      nodeDef.rotation = node.getRotation().toArray();
      nodeDef.scale = node.getScale().toArray();

      nodeIndexMap.set(node, index);
      return nodeDef;
    });
    root.listNodes().forEach((node, index) => {
      if (node.listChildren().length === 0) return;

      const nodeDef = json.nodes[index];
      nodeDef.children = node.listChildren().map(nodeIndexMap.get);
    });

    /* Scenes. */

    json.scenes = root.listScenes().map((scene) => {
      const sceneDef = createElementDef(scene) as GLTF.IScene;
      sceneDef.nodes = scene.listNodes().map(nodeIndexMap.get);
      return sceneDef;
    });

    //

    clean(json);

    return {json, resources};
  }
}

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

/**
 * Removes empty and null values from an object.
 * @param object
 */
function clean(object) {
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