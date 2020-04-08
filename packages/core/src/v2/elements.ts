import { Vector2, Vector3, Vector4 } from "./math";


const NOT_IMPLEMENTED = new Error('Not implemented.');

/***************************************************************
 * Graph
 */

/**
 * A graph manages dependencies among elements.
 */
export class Graph {
    private links: Link<Element, Element>[] = [];

    /**
     * Creates a link between two {@link Element} instances. Link is returned
     * for the caller to store.
     * @param a Owner
     * @param b Resource
     */
    public link(a: Element, b: Element): Link<Element, Element> {
        const link = new Link(a, b);
        this.links.push(link);
        return link;
    }

    /**
     * Disposes of a link, destroying the link in the process. Caller is
     * expected to be the link's owner, and to disconnect it after calling.
     * @param link
     */
    public dispose(link: Link<Element, Element>): Graph {
        this.links = this.links.filter((l) => l !== link);
        link.dispose();
        return this;
    }

    /**
     * Detaches an element, removing all of its inbound links while keeping its
     * outbound resources.
     * @param element
     */
    public detach(element: Element): Graph {
        const prunedLinks = new Set<Link<Element, Element>>();
        for (const link of this.links) {
            if (link.getRight() === element) {
                prunedLinks.add(link);
                link.getLeft().disconnect(link);
            }
        }
        this.links = this.links.filter((link) => !prunedLinks.has(link));
        return this;
    }
}

// An Element is responsible for being able to dissolve a link, without
// knowing in advance what that link is for.
export class Link<Left extends Element, Right extends Element> {
    private disposed: boolean = false;
    constructor(private left: Left, private right: Right) {}
    getLeft(): Left { return this.left; }
    getRight(): Right { return this.right; }
    dispose(): void { this.disposed = true; }
    isDisposed(): boolean { return this.disposed; }
}

/***************************************************************
 * Elements
 *
 * To do:
 * - [ ] Animation
 * - [ ] Image
 */

export abstract class Element {
    protected readonly graph: Graph = null;
    protected name: string = '';
    protected extras: object = {};
    protected extensions: object = {};

    private disposed = false;

    constructor(graph: Graph, name = '') {
        this.graph = graph;
        this.name = name;
    }

    public setName(name: string): Element {
        this.name = name;
        return this;
    }

    public getName(): string { return this.name; }

    public isDisposed(): boolean { return this.disposed; }

    /**
     * Makes a copy of this element with no inbound links, and with cloned outbound links.
     */
    public clone(): Element {
        throw NOT_IMPLEMENTED;
    }

    /**
     * Removes both inbound references to and outbound references from this element.
     */
    public dispose(): void {
        this.detach();
        this.disposed = true;
        // TODO(donmccurdy): No links should exist at this point. Need to confirm that?
    }

    /**
     * Removes all inbound references to this element. Subclasses do not override this method.
     */
    public detach(): Element {
        this.graph.detach(this);
        return this;
    }

    /**
     * Removes any outbound references using the given link. Changes are not
     * propagated elsewhere; it is up to the caller to ensure the graph is
     * updated accordingly.
     *
     * Elements are responsible for being able to disconnect any of their
     * linked resources.
     *
     * @param link
     */
    abstract disconnect(link: Link<Element, Element>): Element;

    // TODO(donmccurdy): Likely to need a listLinks() method or similar, unfortunately.
    // Otherwise, not sure how to ... okay I forgot why.
}

export class Root extends Element {
    private asset: object = {};

    private scenes: Link<Root, Scene>[] = [];
    private nodes: Link<Root, Node>[] = [];
    private meshes: Link<Root, Mesh>[] = [];
    private materials: Link<Root, Material>[] = [];
    private textures: Link<Root, Texture>[] = [];

    public dispose(): void {
        this.scenes.forEach(this.graph.dispose);
        this.scenes.length = 0;
        this.nodes.forEach(this.graph.dispose);
        this.nodes.length = 0;
        this.meshes.forEach(this.graph.dispose);
        this.meshes.length = 0;
        this.materials.forEach(this.graph.dispose);
        this.materials.length = 0;
        this.textures.forEach(this.graph.dispose);
        this.textures.length = 0;
        super.dispose();
    }
    public disconnect(link: Link<Root, Element>): Root {
        this.scenes = this.scenes.filter((child) => child !== link);
        this.nodes = this.nodes.filter((child) => child !== link);
        this.meshes = this.meshes.filter((child) => child !== link);
        this.materials = this.materials.filter((child) => child !== link);
        this.textures = this.textures.filter((child) => child !== link);
        return this;
    }
}

export class Scene extends Element {
    private children: Link<Scene, Node>[] = [];
    public dispose(): void {
        this.children.forEach(this.graph.dispose);
        this.children.length = 0;
        super.dispose();
    }
    public disconnect(link: Link<Scene, Node>): Scene {
        this.children = this.children.filter((child) => child !== link);
        return this;
    }
}

export class Mesh extends Element {
    private primitives: Link<Mesh, Primitive>[] = [];
    public addPrimitive(primitive: Primitive): Mesh {
        const link = this.graph.link(this, primitive) as Link<Mesh, Primitive>;
        this.primitives.push(link);
        return this;
    }
    public listPrimitives(): Primitive[] {
        return this.primitives.map((p) => p.getRight());
    }
    public disconnect(link: Link<Mesh, Element>): Mesh {
        this.primitives = this.primitives.filter((l) => l !== link);
        return this;
    }
    public dispose(): void {
        this.primitives.forEach((link) => this.graph.dispose(link));
        this.primitives.length = 0;
        super.dispose();
    }
}

interface AttributeMap { [key: string]: Link<Primitive, Accessor>; }

export class Primitive extends Element {
    private attributes: AttributeMap = {};
    private indices: Link<Primitive, Accessor> = null;
    private targets: AttributeMap[] = [];
    private targetNames: string[] = [];
    private material: Link<Primitive, Material> = null;
    private mode: GLTF.MeshPrimitiveMode = GLTF.MeshPrimitiveMode.TRIANGLES;

    public getIndices(): Accessor {
        return this.indices ? this.indices.getRight() : null;
    }
    public getAttribute(semantic: string): Accessor {
        return this.attributes[semantic] ? this.attributes[semantic].getRight() : null;
    }
    public listAttributes(): Accessor[] {
        return Object.values(this.attributes).map((link) => link.getRight());
    }
    public listTargets(): Accessor[][] {
        return this.targets.map((target) => Object.values(target).map((link) => link.getRight()));
    }
    public listTargetNames(): string[] { return this.targetNames; }
    public getMaterial(): Material { return this.material.getRight(); }

    public disconnect(link: Link<Primitive, Element>): Primitive {
        for (const semantic in this.attributes) {
            if (this.attributes[semantic] === link) {
                delete this.attributes[semantic];
            }
        }
        if (this.indices === link) {
            this.indices = null;
        }
        for (const target of this.targets) {
            for (const semantic in target) {
                if (this.targets[semantic] === link) {
                    delete this.targets[semantic];
                }
            }
        }
        if (this.material === link) {
            this.material = null;
        }
        return this;
    }

    public dispose(): void {
        throw NOT_IMPLEMENTED;
        super.dispose();
    }
}

export class Attribute {
    private semantic: string = '';
    private accessor: Link<Primitive, Accessor> = null;
    public getSemantic(): string { return this.semantic; }
    public getAccessor(): Accessor { return this.accessor.getRight(); }
}

export type AccessorArray = Float32Array | Uint32Array | Uint16Array | Uint8Array;

export class Accessor extends Element {
    private array: AccessorArray = null;
    private itemSize: number = 1;
    public getArray(): AccessorArray { return this.array; }
    public getItemSize(): number { return this.itemSize; }

    public getX(index: number, x: number): Accessor {
        this.array[index * this.itemSize] = x;
        return this;
    }
    public getXY(index: number, target = new Vector2()): Vector2 {
        target.x = this.array[index * this.itemSize];
        target.y = this.array[index * this.itemSize + 1];
        return target;
    }
    public getXYZ(index: number, target = new Vector3()): Vector3 {
        target.x = this.array[index * this.itemSize];
        target.y = this.array[index * this.itemSize + 1];
        target.z = this.array[index * this.itemSize + 2];
        return target;
    }
    public getXYZW(index: number, target = new Vector4()): Vector4 {
        target.x = this.array[index * this.itemSize];
        target.y = this.array[index * this.itemSize + 1];
        target.z = this.array[index * this.itemSize + 2];
        target.w = this.array[index * this.itemSize + 3];
        return target;
    }

    public setX(index: number, x: number): Accessor {
        this.array[index * this.itemSize] = x;
        return this;
    }
    public setXY(index: number, v: Vector2): Accessor {
        this.array[index * this.itemSize] = v.x;
        this.array[index * this.itemSize + 1] = v.y;
        return this;
    }
    public setXYZ(index: number, v: Vector3): Accessor {
        this.array[index * this.itemSize] = v.x;
        this.array[index * this.itemSize + 1] = v.y;
        this.array[index * this.itemSize + 2] = v.z;
        return this;
    }
    public setXYZW(index: number, v: Vector4): Accessor {
        this.array[index * this.itemSize] = v.x;
        this.array[index * this.itemSize + 1] = v.y;
        this.array[index * this.itemSize + 2] = v.z;
        this.array[index * this.itemSize + 3] = v.w;
        return this;
    }

    public disconnect(link: Link<Accessor, Element>): Accessor {
        throw new Error('Type "Accessor" has no outbound links.');
    }

    public dispose(): void {
        throw NOT_IMPLEMENTED;
        super.dispose();
    }
}

export class Node extends Element {
    private position = new Vector3();
    private quaternion = new Vector4();
    private scale = new Vector3();

    private mesh: Link<Node, Mesh> = null;
    private children: Link<Node, Node>[] = [];

    public getPosition(): Vector3 { return this.position; }
    public getQuaternion(): Vector3 { return this.quaternion; }
    public getScale(): Vector3 { return this.scale; }

    public addChild(child: Node): Node {
        const link = this.graph.link(this, child) as Link<Node, Node>;
        this.children.push(link);
        return this;
    }
    public listChildren(): Node[] {
        return this.children.map((link) => link.getRight());
    }
    public setMesh(mesh: Mesh): Node {
        this.mesh = this.graph.link(this, mesh) as Link<Node, Mesh>;
        return this;
    }
    public getMesh(): Mesh { return this.mesh.getRight(); }

    public disconnect(link: Link<Node, Element>): Node {
        if (this.mesh === link) {
            this.mesh = null;
        }
        this.children = this.children.filter((l) => l !== link);
        return this;
    }

    public dispose(): void {
        throw NOT_IMPLEMENTED;
        super.dispose();
    }
}

export class Material extends Element {
    private alphaMode: GLTF.MaterialAlphaMode = GLTF.MaterialAlphaMode.OPAQUE;
    private alphaCutoff: number;
    private doubleSided: boolean;
    private baseColorFactor: Vector4 = new Vector4(1, 1, 1, 1);
    private baseColorTexture: Link<Material, Texture> = null;
    private emissiveFactor: Vector3 = new Vector3(0, 0, 0);
    private emissiveTexture: Link<Material, Texture> = null;

    public getAlphaMode(): GLTF.MaterialAlphaMode { return this.alphaMode; }
    public getAlphaCutoff(): number { return this.alphaCutoff; }
    public getDoubleSided(): boolean { return this.doubleSided; }

    public getBaseColorFactor(): Vector4 { return this.baseColorFactor; }
    public getEmissiveFactor(): Vector3 { return this.emissiveFactor; }

    public getBaseColorTexture(): Texture { return this.baseColorTexture.getRight(); }
    public getEmissiveTexture(): Texture { return this.emissiveTexture.getRight(); }

    public disconnect(link: Link<Material, Element>): Material {
        if (this.baseColorTexture === link) {
            this.baseColorTexture = null;
        }
        if (this.emissiveTexture === link) {
            this.emissiveTexture = null;
        }
        return this;
    }

    public dispose(): void {
        throw NOT_IMPLEMENTED;
        super.dispose();
    }
}

// TODO(donmccurdy): Not totally sure this should be its own class.
// Consider an ImageReference? Something more graph-link-like?
//
// Material --> [ TextureInfo, Texture, Sampler ] --> Image
export class Texture extends Element {
    public disconnect(link: Link<Texture, Element>): Texture {
        throw NOT_IMPLEMENTED;
    }

    public dispose(): void {
        throw NOT_IMPLEMENTED;
        super.dispose();
    }
}

/***************************************************************
 * Archive
 */

// export class List<T> {
//     private items: T[] = [];

//     constructor (items: T[]) {
//         this.items = items;
//     }

//     map(fn: (T) => T): List<T> {
//         this.items = this.items.map(fn);
//         return this;
//     }

//     forEach(fn: (T) => void): List<T> {
//         this.items.forEach(fn);
//         return this;
//     }

//     filter(fn: (T) => boolean): List<T> {
//         this.items = this.items.filter(fn);
//         return this;
//     }

//     remove(item: T): List<T> {
//         return this.filter((i) => i !== item);
//     }

// }