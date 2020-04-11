import { Accessor, Buffer, BufferView, Element, Material, Node, Texture } from "../elements/index";
import { IBufferMap } from "../v1/container";
import { Container } from "./container";

type ElementDef = GLTF.IScene | GLTF.INode | GLTF.IMaterial | GLTF.ISkin | GLTF.ITexture;

export class GLTFWriter {
  public static write(container: Container): {json: GLTF.IGLTF, resources: IBufferMap} {
    const root = container.getRoot();
    const json: GLTF.IGLTF = {asset: root.getAsset()};
    const resources = {} as IBufferMap;

    /* Index lookup. */

    const bufferIndexMap = new Map<Buffer, number>();
    const bufferViewIndexMap = new Map<BufferView, number>();
    const accessorIndexMap = new Map<Accessor, number>();
    const materialIndexMap = new Map<Material, number>();
    const nodeIndexMap = new Map<Node, number>();
    const textureIndexMap = new Map<Texture, number>();

    /* Buffers. */

    json.buffers = root.listBuffers().map((buffer, index) => {
      const bufferDef = createElementDef(buffer) as GLTF.IBuffer;

      // bufferDef.byteLength
      // bufferDef.uri

      bufferIndexMap.set(buffer, index);
      return bufferDef;
    });

    /* Buffer views. */

    json.bufferViews = root.listBufferViews().map((bufferView, index) => {
      const bufferViewDef = createElementDef(bufferView) as GLTF.IBufferView;
      bufferViewDef.buffer = bufferIndexMap.get(bufferView.getBuffer());

      // bufferViewDef.byteLength
      // bufferViewDef.byteOffset
      // bufferViewDef.byteStride

      bufferViewIndexMap.set(bufferView, index);
      return bufferViewDef;
    });

    /* Accessors. */

    json.accessors = root.listAccessors().map((accessor, index) => {
      const accessorDef = createElementDef(accessor) as GLTF.IAccessor;
      accessorDef.bufferView = bufferViewIndexMap.get(accessor.getBufferView());

      accessorDef.type = accessor.getType();
      accessorDef.componentType = accessor.getComponentType();
      accessorDef.count = accessor.getCount();
      accessorDef.max = accessor.getMax();
      accessorDef.min = accessor.getMin();

      // accessorDef.byteOffset

      // TODO(donmccurdy): accessorDef.normalized
      // TODO(donmccurdy): accessorDef.sparse

      accessorIndexMap.set(accessor, index);
      return accessorDef;
    });

    /**
     * WRITING BUFFER VIEWS
     *
     * Image:
     * (1) 1 image = 1 Buffer View
     *
     * Other:
     * (1) For each Buffer View
     *   (2) Find all assigned Accessors
     *     (3) Delegate to BufferViewLayoutStrategy [ SEQUENTIAL | INTERLEAVED | ... ]
     *     (3.1a) If all indices, set target=ELEMENT_ARRAY_BUFFER. Interleaving disallowed.
     *     (3.1b) If all attributes, set target=ARRAY_BUFFER. Interleaving is fine.
     *     (3.1c) Else, target is not set. Interleaving is unnecessary.
     *     (3.2) Apply normalization or sparse conversions to accessor data. Sparse for morph targets, maybe.
     *
     * Implementation Note: JavaScript client implementations should convert JSON-parsed floating-point
     * doubles to single precision, when componentType is 5126 (FLOAT). This could be done with Math.fround
     * function. Applies to accessor.min/max.
     * 
     * ... maybe just set up graph output, and see what gltfpack writes for a few models?
     */

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