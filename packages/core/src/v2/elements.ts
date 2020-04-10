import { Vector2, Vector3, Vector4 } from "./math";
import { AccessorComponentType, AccessorTypeData } from "../core";

/**
 * Elements.
 *
 * TODO(donmccurdy): Separating the Graph and Element classes into separate files
 * seems like an obviously nice housekeeping goal. The inter-dependencies are a bit
 * tricky though, if we want to be strict about circular dependencies.
 */

export type TypedArray = Float32Array | Uint32Array | Uint16Array | Uint8Array;

const NOT_IMPLEMENTED = new Error('Not implemented.');

/***************************************************************
 * Graph
 */

/**
 * A graph manages dependencies among elements.
 */
export class Graph {
    private links: Link<Element, Element>[] = [];

    public listParentElements(element: Element): Element[] {
        // #optimize
        return this.links
            .filter((link) => link.getRight() === element)
            .map((link) => link.getLeft());
    }

    public listChildElements(element: Element): Element[] {
        // #optimize
        return this.links
            .filter((link) => link.getLeft() === element)
            .map((link) => link.getRight());
    }

    public disconnectChildElements(element: GraphElement): Graph {
        // #optimize
        this.links
            .filter((link) => link.getLeft() === element)
            .forEach((link) => link.dispose());
        return this;
    }

    public disconnectParentElements(element: GraphElement): Graph {
        // #optimize
        this.links
            .filter((link) => link.getRight() === element)
            .forEach((link) => link.dispose());
        return this;
    }

    /**
     * Creates a link between two {@link Element} instances. Link is returned
     * for the caller to store.
     * @param a Owner
     * @param b Resource
     */
    public link(a: Element, b: Element | null): Link<Element, Element> {
        // If there's no resource, return a null link. Avoids a lot of boilerplate
        // in Element setters.
        if (!b) return null;

        const link = new Link(a, b);
        this.registerLink(link);
        return link;
    }

    public linkTexture(a: Material, b: Texture): TextureLink {
        const link = new TextureLink(a, b);
        this.registerLink(link);
        return link;
    }

    public linkAttribute(a: Primitive, b: Accessor): AttributeLink {
        const link = new AttributeLink(a, b);
        this.registerLink(link);
        return link;
    }

    private registerLink(link: Link<Element, Element>) {
        this.links.push(link);
        link.onDispose(() => this.unlink(link));
        return link;
    }

    /**
     * Removes the link from the graph. This method should only be invoked by
     * the onDispose() listener created in {@link link()}. The public method
     * of removing a link is {@link link.dispose()}.
     * @param link
     */
    private unlink(link: Link<Element, Element>): Graph {
        this.links = this.links.filter((l) => l !== link);
        return this;
    }
}

/**
 * Represents a connection between two {@link Element} resources in a {@link Graph}.
 *
 * The left element is considered the owner, and the right element the resource. The
 * owner is responsible for being able find and remove a reference to a resource, given
 * that link. The resource does not hold a reference to the link or to the owner,
 * although that reverse lookup can be done on the graph.
 */
export class Link<Left extends Element, Right extends Element> {
    private disposed: boolean = false;
    private listeners: (() => void)[] = [];
    constructor(private left: Left, private right: Right) {}

    /** Owner element. */
    getLeft(): Left { return this.left; }

    /** Resource element. */
    getRight(): Right { return this.right; }

    /** Destroys a (currently intact) link, updating both the graph and the owner. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.listeners.forEach((fn) => fn());
        this.listeners.length = 0;
    }

    /** Registers a listener to be invoked if this link is destroyed. */
    onDispose(fn: () => void): Link<Left, Right> {
        this.listeners.push(fn);
        return this;
    }

    /** Whether this link has been destroyed. */
    isDisposed(): boolean { return this.disposed; }
}

/***************************************************************
 * Elements
 */

// TODO(donmccurdy): Perhaps the Graph-related stuff here could be moved
// into another parent class (GraphElement?), so that Element deals only
// with glTF concepts.

// TODO(donmccurdy): Some kind of UUID on each graph element would be nice.
// Maybe a 4-5 character base64 hash?

abstract class GraphElement {
    protected readonly graph: Graph = null;
    private disposed = false;
    constructor(graph: Graph) {
        this.graph = graph;
    }

    public isDisposed(): boolean { return this.disposed; }

    /**
     * Removes both inbound references to and outbound references from this element.
     */
    public dispose(): void {
        this.graph.disconnectChildElements(this);
        this.graph.disconnectParentElements(this);
        this.disposed = true;
    }

    /**
     * Removes all inbound references to this element. Subclasses do not override this method.
     */
    public detach(): GraphElement {
        this.graph.disconnectParentElements(this);
        return this;
    }

    protected addGraphChild(links: Link<Element, Element>[], link: Link<Element, Element>): GraphElement {
        links.push(link);
        // This listener handles dispose events for arrays of Links. The @GraphChild
        // annotation handles the events for property Links.
        link.onDispose(() => {
            // console.log('[GraphElement] Removing disposed link from array.');
            const remaining = links.filter((l) => l !== link);
            links.length = 0;
            links.push(...remaining);
        });
        return this;
    }

    protected removeGraphChild(links: Link<Element, Element>[], child: Element): GraphElement {
        const pruned = links.filter((link) => link.getRight() === child);
        pruned.forEach((link) => link.dispose());
        return this;
    }
}

export abstract class Element extends GraphElement {
    protected name: string = '';
    protected extras: object = {};

    // TODO(donmccurdy): Extensions should be Elements.
    protected extensions: object = {};

    constructor(graph: Graph, name = '') {
        super(graph);
        this.name = name;
    }

    public getName(): string { return this.name; }
    public setName(name: string): Element {
        this.name = name;
        return this;
    }

    public getExtras(): object { return this.extras; }
    public setExtras(extras: object): Element {
        this.extras = extras;
        return this;
    }

    public getExtensions(): object { return this.extensions; }
    public setExtensions(extensions: object): Element {
        this.extensions = extensions;
        return this;
    }

    /**
     * Makes a copy of this element with no inbound links, and with cloned outbound links.
     */
    public clone(): Element {
        throw NOT_IMPLEMENTED;
    }

    /**
     * Returns true if the given element is equivalent to this one. Equivalency requires that all
     * outbound links reference the same elements. Inbound links are not considered.
     */
    public equals(element: Element): boolean {
        throw NOT_IMPLEMENTED;
    }
}

function GraphChild (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
        get: function () {
            return this['_' + propertyKey];
        },
        set: function (value) {
            const link = this['_' + propertyKey];

            if (link && !Array.isArray(link)) {
                // console.log('[GraphChild] Disposing link: ' + propertyKey, link, value);
                link.dispose();
            }

            if (value && !Array.isArray(value)) {
                // This listener handles dispose events for property Links. The addGraphChild
                // method handles the events for arrays of Links.
                value.onDispose(() => {
                    // console.log('[GraphChild] Unassigning link: ' + propertyKey, link);
                    this['_' + propertyKey] = null;
                });
            }

            // if (value) console.log('[GraphChild] Assigning link: ' + propertyKey, value);
            this['_' + propertyKey] = value;
        },
        enumerable: true
    });
}

function GraphChildList (target: any, propertyKey: string) {}

export class Root extends Element {
    private asset: GLTF.IAsset = {
        generator: 'glTF-Transform v0.1', // TODO(donmccurdy): Autogenerate this.
        version: '2.0'
    };

    @GraphChildList private scenes: Link<Root, Scene>[] = [];
    @GraphChildList private nodes: Link<Root, Node>[] = [];
    @GraphChildList private meshes: Link<Root, Mesh>[] = [];
    @GraphChildList private materials: Link<Root, Material>[] = [];
    @GraphChildList private textures: Link<Root, Texture>[] = [];
    @GraphChildList private accessors: Link<Root, Accessor>[] = [];

    public getAsset(): GLTF.IAsset { return this.asset; }

    public updateAsset(asset: object): Root {
        Object.assign(this.asset, asset);
        return this;
    }

    public addScene(scene: Scene): Root {
        return this.addGraphChild(this.scenes, this.graph.link(this, scene) as Link<Root, Scene>) as Root;
    }
    public removeScene(scene: Scene): Root {
        return this.removeGraphChild(this.scenes, scene) as Root;
    }
    public listScenes(): Scene[] {
        return this.scenes.map((p) => p.getRight());
    }

    public addNode(node: Node): Root {
        return this.addGraphChild(this.nodes, this.graph.link(this, node) as Link<Root, Node>) as Root;
    }

    public removeNode(node: Node): Root {
        return this.removeGraphChild(this.nodes, node) as Root;
    }

    public listNodes(): Node[] {
        return this.nodes.map((p) => p.getRight());
    }

    public addMesh(mesh: Mesh): Root {
        return this.addGraphChild(this.meshes, this.graph.link(this, mesh) as Link<Root, Mesh>) as Root;
    }

    public removeMesh(mesh: Mesh): Root {
        return this.removeGraphChild(this.meshes, mesh) as Root;
    }

    public listMeshes(): Mesh[] {
        return this.meshes.map((p) => p.getRight());
    }

    public addMaterial(material: Material): Root {
        return this.addGraphChild(this.materials, this.graph.link(this, material) as Link<Root, Material>) as Root;
    }

    public removeMaterial(material: Material): Root {
        return this.removeGraphChild(this.materials, material) as Root;
    }

    public listMaterials(): Material[] {
        return this.materials.map((p) => p.getRight());
    }

    public addTexture(texture: Texture): Root {
        return this.addGraphChild(this.textures, this.graph.link(this, texture) as Link<Root, Texture>) as Root;
    }

    public removeTexture(texture: Texture): Root {
        return this.removeGraphChild(this.textures, texture) as Root;
    }

    public listTextures(): Texture[] {
        return this.textures.map((p) => p.getRight());
    }

    public addAccessor(accessor: Accessor): Root {
        return this.addGraphChild(this.accessors, this.graph.link(this, accessor) as Link<Root, Accessor>) as Root;
    }

    public removeAccessor(accessor: Accessor): Root {
        return this.removeGraphChild(this.accessors, accessor) as Root;
    }

    public listAccessors(): Accessor[] {
        return this.accessors.map((p) => p.getRight());
    }
}

export class Scene extends Element {
    @GraphChildList private nodes: Link<Scene, Node>[] = [];
    public addNode(node: Node): Scene {
        return this.addGraphChild(this.nodes, this.graph.link(this, node) as Link<Root, Node>) as Scene;
    }

    public removeNode(node: Node): Scene {
        return this.removeGraphChild(this.nodes, node) as Scene;
    }

    public listNodes(): Node[] {
        return this.nodes.map((p) => p.getRight());
    }
}

export class Mesh extends Element {
    @GraphChildList private primitives: Link<Mesh, Primitive>[] = [];

    public addPrimitive(primitive: Primitive): Mesh {
        return this.addGraphChild(this.primitives, this.graph.link(this, primitive) as Link<Root, Primitive>) as Mesh;
    }

    public removePrimitive(primitive: Primitive): Mesh {
        return this.removeGraphChild(this.primitives, primitive) as Mesh;
    }

    public listPrimitives(): Primitive[] {
        return this.primitives.map((p) => p.getRight());
    }
}

// interface AttributeMap { [key: string]: Link<Primitive, Accessor>; }

class AttributeLink extends Link<Primitive, Accessor> {
    public semantic = '';
}

export class Primitive extends Element {
    private mode: GLTF.MeshPrimitiveMode = GLTF.MeshPrimitiveMode.TRIANGLES;
    // TODO(donmccurdy): Kinda feeling like I want an accessors array and a semantics array.
    // private attributeSemantics: {[key: string]: number} = {};
    // private targetSemantics: {[key: string]: number}[] = [];
    // private targets: AttributeMap[] = [];
    // private targetNames: string[] = [];

    @GraphChild private indices: Link<Primitive, Accessor> = null;
    @GraphChildList private attributes: AttributeLink[] = [];
    // @GraphChildList private targets: AttributeLink[][] = [];
    @GraphChild private material: Link<Primitive, Material> = null;

    public getIndices(): Accessor {
        return this.indices ? this.indices.getRight() : null;
    }
    public setIndices(indices: Accessor): Primitive {
        this.indices = this.graph.link(this, indices) as Link<Primitive, Accessor>;
        return this;
    }
    public getAttribute(semantic: string): Accessor {
        const link = this.attributes.find((link) => link.semantic === semantic);
        return link ? link.getRight() : null;
    }
    public setAttribute(semantic: string, accessor: Accessor): Primitive {
        const link = this.graph.linkAttribute(this, accessor) as AttributeLink;
        link.semantic = semantic;
        return this.addGraphChild(this.attributes, link) as Primitive;
    }

    public listAttributes(): Accessor[] {
        return this.attributes.map((link) => link.getRight());
    }

    public listTargets(): Accessor[][] {
        throw NOT_IMPLEMENTED;
        // return this.targets.map((target) => Object.values(target).map((link) => link.getRight()));
    }
    public listTargetNames(): string[] {
        throw NOT_IMPLEMENTED;
     }
    public getMaterial(): Material { return this.material.getRight(); }
    public setMaterial(material: Material): Primitive {
        this.material = this.graph.link(this, material) as Link<Primitive, Material>;
        return this;
    }
    public getMode(): GLTF.MeshPrimitiveMode { return this.mode; }
    public setMode(mode: GLTF.MeshPrimitiveMode): Primitive {
        this.mode = mode;
        return this;
    }
}

export class Attribute {
    private semantic: string = '';
    @GraphChild private accessor: Link<Primitive, Accessor> = null;
    public getSemantic(): string { return this.semantic; }
    public getAccessor(): Accessor { return this.accessor.getRight(); }
}

export class Accessor extends Element {
    private array: TypedArray = null;
    private type: GLTF.AccessorType = GLTF.AccessorType.SCALAR;
    public getArray(): TypedArray { return this.array; }
    public setArray(array: TypedArray): Accessor {
        this.array = array;
        return this;
    }
    public getType(): GLTF.AccessorType { return this.type; }
    public setType(type: GLTF.AccessorType): Accessor {
        this.type = type;
        return this;
    }
    public getComponentType(): GLTF.AccessorComponentType {
        switch (this.array.constructor) {
            case Float32Array:
                return AccessorComponentType.FLOAT;
            case Uint32Array:
                return AccessorComponentType.UNSIGNED_INT;
            case Uint16Array:
                return AccessorComponentType.UNSIGNED_SHORT;
            case Uint8Array:
                return AccessorComponentType.UNSIGNED_BYTE;
            default:
                throw new Error('Unknown accessor componentType.');
        }
    }
    public getCount(): number {
        return this.array.length / this.getItemSize();
    }

    public getMin(): number[] {
        throw new Error('accessor.getMin() not implemented.');
    }

    public getMax(): number[] {
        throw new Error('accessor.getMax() not implemented.');
    }

    private getItemSize(): number {
        return AccessorTypeData[this.type].size;
    }

    public getX(index: number, x: number): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = x;
        return this;
    }
    public getXY(index: number, target = new Vector2()): Vector2 {
        const itemSize = this.getItemSize();
        target.x = this.array[index * itemSize];
        target.y = this.array[index * itemSize + 1];
        return target;
    }
    public getXYZ(index: number, target = new Vector3()): Vector3 {
        const itemSize = this.getItemSize();
        target.x = this.array[index * itemSize];
        target.y = this.array[index * itemSize + 1];
        target.z = this.array[index * itemSize + 2];
        return target;
    }
    public getXYZW(index: number, target = new Vector4()): Vector4 {
        const itemSize = this.getItemSize();
        target.x = this.array[index * itemSize];
        target.y = this.array[index * itemSize + 1];
        target.z = this.array[index * itemSize + 2];
        target.w = this.array[index * itemSize + 3];
        return target;
    }

    public setX(index: number, x: number): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = x;
        return this;
    }
    public setXY(index: number, v: Vector2): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = v.x;
        this.array[index * itemSize + 1] = v.y;
        return this;
    }
    public setXYZ(index: number, v: Vector3): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = v.x;
        this.array[index * itemSize + 1] = v.y;
        this.array[index * itemSize + 2] = v.z;
        return this;
    }
    public setXYZW(index: number, v: Vector4): Accessor {
        const itemSize = this.getItemSize();
        this.array[index * itemSize] = v.x;
        this.array[index * itemSize + 1] = v.y;
        this.array[index * itemSize + 2] = v.z;
        this.array[index * itemSize + 3] = v.w;
        return this;
    }
}

export class Node extends Element {
    private translation = new Vector3();
    private rotation = new Vector4();
    private scale = new Vector3();

    @GraphChild private mesh: Link<Node, Mesh> = null;
    @GraphChildList private children: Link<Node, Node>[] = [];

    public getTranslation(): Vector3 { return this.translation; }
    public getRotation(): Vector3 { return this.rotation; }
    public getScale(): Vector3 { return this.scale; }

    public setTranslation(translation: Vector3): Node {
        this.translation = translation;
        return this;
    }
    public setRotation(rotation: Vector4): Node {
        this.rotation = rotation;
        return this;
    }
    public setScale(scale: Vector3): Node {
        this.scale = scale;
        return this;
    }

    public addChild(child: Node): Node {
        return this.addGraphChild(this.children, this.graph.link(this, child) as Link<Root, Node>) as Node;
    }
    public removeChild(child: Node): Node {
        return this.removeGraphChild(this.children, child) as Node;
    }
    public listChildren(): Node[] {
        return this.children.map((link) => link.getRight());
    }
    public setMesh(mesh: Mesh): Node {
        this.mesh = this.graph.link(this, mesh) as Link<Node, Mesh>;
        return this;
    }
    public getMesh(): Mesh { return this.mesh.getRight(); }
}

export class Material extends Element {
    private alphaMode: GLTF.MaterialAlphaMode = GLTF.MaterialAlphaMode.OPAQUE;
    private alphaCutoff: number;
    private doubleSided: boolean;
    private baseColorFactor: Vector4 = new Vector4(1, 1, 1, 1);
    private emissiveFactor: Vector3 = new Vector3(0, 0, 0);

    @GraphChild private baseColorTexture: TextureLink = null;
    @GraphChild private emissiveTexture: TextureLink = null;
    @GraphChild private normalTexture: TextureLink = null;
    @GraphChild private occlusionTexture: TextureLink = null;
    @GraphChild private roughnessMetallicTexture: TextureLink = null;

    public getAlphaMode(): GLTF.MaterialAlphaMode { return this.alphaMode; }
    public getAlphaCutoff(): number { return this.alphaCutoff; }
    public getDoubleSided(): boolean { return this.doubleSided; }

    public setAlphaMode(alphaMode: GLTF.MaterialAlphaMode): Material {
        this.alphaMode = alphaMode;
        return this;
    }
    public setAlphaCutoff(alphaCutoff: number): Material {
        this.alphaCutoff = alphaCutoff;
        return this;
    }
    public setDoubleSided(doubleSided: boolean): Material {
        this.doubleSided = doubleSided;
        return this;
    }

    public getBaseColorFactor(): Vector4 { return this.baseColorFactor; }
    public getEmissiveFactor(): Vector3 { return this.emissiveFactor; }

    public setBaseColorFactor(baseColorFactor: Vector4): Material {
        this.baseColorFactor = baseColorFactor;
        return this;
    }
    public setEmissiveFactor(emissiveFactor: Vector3): Material {
        this.emissiveFactor = emissiveFactor;
        return this;
    }

    public getBaseColorTexture(): Texture { return this.baseColorTexture.getRight(); }
    public getBaseColorTextureInfo(): TextureInfo { return this.baseColorTexture.textureInfo; }
    public getEmissiveTexture(): Texture { return this.emissiveTexture.getRight(); }
    public getEmissiveTextureInfo(): TextureInfo { return this.emissiveTexture.textureInfo; }

    public setBaseColorTexture(texture: Texture): Material {
        this.baseColorTexture = this.graph.linkTexture(this, texture);
        return this;
    }
    public setEmissiveTexture(texture: Texture): Material {
        this.emissiveTexture = this.graph.linkTexture(this, texture);
        return this;
    }
}

export class Texture extends Element {
    private buffer: ArrayBuffer = null;
    private mimeType: GLTF.ImageMimeType = null;

    public getBuffer(): ArrayBuffer { return this.buffer; }
    public setBuffer(buffer: ArrayBuffer): Texture {
        this.buffer = buffer;
        return this;
    }

    public getMimeType(): GLTF.ImageMimeType { return this.mimeType; }
    public setMimeType(mimeType: GLTF.ImageMimeType): Texture {
        this.mimeType = mimeType;
        return this;
    }
}

class TextureLink extends Link<Material, Texture> {
    public textureInfo = new TextureInfo();
}

export class TextureInfo {
    private texCoord: number = 0;
    private magFilter: GLTF.TextureMagFilter = null;
    private minFilter: GLTF.TextureMinFilter = null;
    private wrapS: GLTF.TextureWrapMode = GLTF.TextureWrapMode.REPEAT;
    private wrapT: GLTF.TextureWrapMode = GLTF.TextureWrapMode.REPEAT;

    public getTexCoord(): number { return this.texCoord; }
    public setTexCoord(texCoord: number): TextureInfo {
        this.texCoord = texCoord;
        return this;
    }

    public getMagFilter(): GLTF.TextureMagFilter { return this.magFilter; }
    public setMagFilter(magFilter: GLTF.TextureMagFilter): TextureInfo {
        this.magFilter = magFilter;
        return this;
    }

    public getMinFilter(): GLTF.TextureMinFilter { return this.minFilter; }
    public setMinFilter(minFilter: GLTF.TextureMinFilter): TextureInfo {
        this.minFilter = minFilter;
        return this;
    }

    public getWrapS(): GLTF.TextureWrapMode { return this.wrapS; }
    public setWrapS(wrapS: GLTF.TextureWrapMode): TextureInfo {
        this.wrapS = wrapS;
        return this;
    }

    public getWrapT(): GLTF.TextureWrapMode { return this.wrapT; }
    public setWrapT(wrapT: GLTF.TextureWrapMode): TextureInfo {
        this.wrapT = wrapT;
        return this;
    }
}
