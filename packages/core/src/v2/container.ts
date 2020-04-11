import { Accessor, Buffer, BufferView, ElementGraph, Material, Mesh, Node, Primitive, Root, Scene, Texture } from "../elements/index";

export class Container {
  private graph: ElementGraph = new ElementGraph();
  private root: Root = new Root(this.graph);

  public getRoot(): Root {
    return this.root;
  }

  public clone(): Container {
    throw new Error('Not implemented.');
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
  createPrimitive(): Primitive {
    const primitive = new Primitive(this.graph);
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
  createAccessor(name: string, bufferView: BufferView): Accessor {
    const accessor = new Accessor(this.graph, name).setBufferView(bufferView);
    this.root.addAccessor(accessor);
    return accessor;
  }
  createBufferView(name: string, buffer: Buffer): BufferView {
    const bufferView = new BufferView(this.graph, name).setBuffer(buffer);
    this.root.addBufferView(bufferView);
    return bufferView;
  }
  createBuffer(name: string): Buffer {
    const buffer = new Buffer(this.graph, name);
    this.root.addBuffer(buffer);
    return buffer;
  }
}
