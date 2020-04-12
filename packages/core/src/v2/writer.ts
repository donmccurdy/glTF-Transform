import { Accessor, AttributeLink, Buffer, Element, IndexLink, Material, Mesh, Node, Root, Texture } from "../elements/index";
import { Link } from "../graph/index";
import { GLTFUtil } from "../util";
import { uuid } from "../uuid";
import { IBufferMap } from "../v1/container";
import { Container } from "./container";

type ElementDef = GLTF.IScene | GLTF.INode | GLTF.IMaterial | GLTF.ISkin | GLTF.ITexture;

// TODO(donmccurdy): Default buffer currently named with empty string.
const DEFAULT_BUFFER_URI = 'test-' + uuid() + '.bin';

// TODO(donmccurdy): Not sure what this test error is:
// (node:60004) [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.

// TODO(donmccurdy): Need Math.fround() everywhere. Maybe in clean() step?

export class GLTFWriter {
  public static write(container: Container): {json: GLTF.IGLTF, resources: IBufferMap} {
    const root = container.getRoot();
    const json: GLTF.IGLTF = {asset: root.getAsset()};
    const resources = {} as IBufferMap;

    /* Index lookup. */

    const bufferIndexMap = new Map<Buffer, number>();
    const accessorIndexMap = new Map<Accessor, number>();
    const materialIndexMap = new Map<Material, number>();
    const meshIndexMap = new Map<Mesh, number>();
    const nodeIndexMap = new Map<Node, number>();
    const textureIndexMap = new Map<Texture, number>();

    /* Link and data use pre-processing. */

    const accessorLinks = new Map<Element, Link<Element, Element>[]>();

    // Gather all accessors, creating a map to look up their uses.
    for (const link of container.getGraph().getLinks()) {
      if (link.getLeft() === root) continue;

      const child = link.getRight();

      if (child instanceof Accessor) {
        const uses = accessorLinks.get(child) || [];
        uses.push(link as Link<Element, Element>);
        accessorLinks.set(child, uses);
      }
    }

    /* Buffers, buffer views, and accessors. */

    json.accessors = [];
    json.bufferViews = [];
    json.buffers = root.listBuffers().map((buffer, bufferIndex) => {
      const bufferDef = createElementDef(buffer) as GLTF.IBuffer;

      const attributeAccessors = new Set<Accessor>();
      const indexAccessors = new Set<Accessor>();
      const otherAccessors = new Set<Accessor>();

      const bufferParents = container.getGraph()
        .listParentElements(buffer)
        .filter((element) => !(element instanceof Root)) as Element[];

      // Categorize accessors by use.
      for (const parent of bufferParents) {
        if ((!(parent instanceof Accessor))) { // Texture
          // TODO(donmccurdy): Remove.
          console.error('TODO:ERROR', parent);
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
          attributeAccessors.add(parent);
        } else if (isIndex && !isAttribute && !isOther) {
          indexAccessors.add(parent);
        } else if (isOther && !isAttribute && !isIndex) {
          otherAccessors.add(parent);
        } else {
          // TODO(donmccurdy): Remove.
          console.error('TODO:ERROR', accessorRefs);
          throw new Error('Attribute or index accessors must be used only for that purpose.');
        }
      }

      function writeBufferView(accessors: Accessor[], byteOffset: number, target: string): [number, ArrayBuffer[]] {
        const accessorData: ArrayBuffer[] = [];
        let innerByteOffset = 0;

        // TODO(donmccurdy): Remove.
        console.log(target + ' -- list', accessors.map((a) => a.getArray()));

        for (const accessor of accessors) {
          const accessorDef = createElementDef(accessor) as GLTF.IAccessor;
          accessorDef.name = target; // TODO(donmccurdy): Remove.
          accessorDef.bufferView = json.bufferViews.length;
          accessorDef.type = accessor.getType();
          accessorDef.componentType = accessor.getComponentType();
          accessorDef.count = accessor.getCount();
          accessorDef.max = accessor.getMax();
          accessorDef.min = accessor.getMin();
          // TODO(donmccurdy): accessorDef.normalized
          // TODO(donmccurdy): accessorDef.sparse

          // TODO(donmccurdy): Whyyyyy. Ok gotta trim more buffers, earlier.
          const data = GLTFUtil.pad(accessor.getArray().slice().buffer);
          accessorDef.byteOffset = innerByteOffset;
          innerByteOffset += data.byteLength;
          accessorData.push(data);

          accessorIndexMap.set(accessor, json.accessors.length);
          json.accessors.push(accessorDef);
        }

        // Skip unneeded buffer views.
        if (!innerByteOffset) return [0, [new ArrayBuffer(0)]];

        const bufferViewData = GLTFUtil.concat(accessorData);
        const bufferViewDef: GLTF.IBufferView = {
          buffer: bufferIndex,
          byteLength: bufferViewData.byteLength,
          byteOffset: byteOffset,
          // TODO(donmccurdy): byteStride: target === 'attribute' ?
          // TODO(donmccurdy): .target
        };
        json.bufferViews.push(bufferViewDef);

        return [innerByteOffset, accessorData];
      }

      const [indexByteLength, indexData] = writeBufferView(Array.from(indexAccessors), 0, 'index');
      const [attributeByteLength, attributeData] = writeBufferView(Array.from(attributeAccessors), indexByteLength, 'attribute');
      const [otherByteLength, otherData] = writeBufferView(Array.from(otherAccessors), attributeByteLength, '');

      bufferDef.uri = DEFAULT_BUFFER_URI;
      bufferDef.byteLength = indexByteLength + attributeByteLength + otherByteLength;
      resources[DEFAULT_BUFFER_URI] = GLTFUtil.concat([...indexData, ...attributeData, ...otherData]);

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