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

    /**
     * Creates a link between two {@link Element} instances. Link is returned
     * for the caller to store.
     * @param a Owner
     * @param b Resource
     */
    public link(a: Element, b: Element): Link<Element, Element> {
        const link = new Link(a, b);
        this.registerLink(link);
        return link;
    }

    public linkTexture(a: Material, b: Texture): TextureLink {
        const link = new TextureLink(a, b);
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
        this.getLeft().disconnect(this);
        this.disposed = true;
        this.listeners.forEach((fn) => fn());
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

    public isDisposed(): boolean { return this.disposed; }

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

    /**
     * Removes both inbound references to and outbound references from this element.
     */
    public dispose(): void {
        this.detach();
        this.disposed = true;
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
     * updated accordingly. This method is usually invoked by disposing a
     * link, or by calling a setter that destroys a previous link.
     *
     * Elements are responsible for being able to disconnect any of their
     * linked resources.
     *
     * @param link
     */
    abstract disconnect(link: Link<Element, Element>): Element;
}

export class Root extends Element {
    private asset: GLTF.IAsset = {
        generator: 'glTF-Transform v0.1', // TODO(donmccurdy): Autogenerate this.
        version: '2.0'
    };

    private scenes: Link<Root, Scene>[] = [];
    private nodes: Link<Root, Node>[] = [];
    private meshes: Link<Root, Mesh>[] = [];
    private materials: Link<Root, Material>[] = [];
    private textures: Link<Root, Texture>[] = [];
    private accessors: Link<Root, Accessor>[] = [];

    public getAsset(): GLTF.IAsset { return this.asset; }

    public updateAsset(asset: object): Root {
        Object.assign(this.asset, asset);
        return this;
    }

    public addScene(scene: Scene): Root {
        this.scenes.push(this.graph.link(this, scene) as Link<Root, Scene>);
        return this;
    }
    public removeScene(scene: Scene): Root {
        const link = this.scenes.find((link) => link.getRight() === scene);
        link.dispose();
        return this;
    }
    public listScenes(): Scene[] {
        return this.scenes.map((p) => p.getRight());
    }

    public addNode(node: Node): Root {
        this.nodes.push(this.graph.link(this, node) as Link<Root, Node>);
        return this;
    }
    public removeNode(node: Node): Root {
        const link = this.nodes.find((link) => link.getRight() === node);
        link.dispose();
        return this;
    }
    public listNodes(): Node[] {
        return this.nodes.map((p) => p.getRight());
    }

    public addMesh(mesh: Mesh): Root {
        this.meshes.push(this.graph.link(this, mesh) as Link<Root, Mesh>);
        return this;
    }
    public removeMesh(mesh: Mesh): Root {
        const link = this.meshes.find((link) => link.getRight() === mesh);
        link.dispose();
        return this;
    }
    public listMeshes(): Mesh[] {
        return this.meshes.map((p) => p.getRight());
    }

    public addMaterial(material: Material): Root {
        this.materials.push(this.graph.link(this, material) as Link<Root, Material>);
        return this;
    }
    public removeMaterial(material: Material): Root {
        const link = this.materials.find((link) => link.getRight() === material);
        link.dispose();
        return this;
    }
    public listMaterials(): Material[] {
        return this.materials.map((p) => p.getRight());
    }

    public addTexture(texture: Texture): Root {
        this.textures.push(this.graph.link(this, texture) as Link<Root, Texture>);
        return this;
    }
    public removeTexture(texture: Texture): Root {
        const link = this.textures.find((link) => link.getRight() === texture);
        link.dispose();
        return this;
    }
    public listTextures(): Texture[] {
        return this.textures.map((p) => p.getRight());
    }

    public addAccessor(accessor: Accessor): Root {
        this.accessors.push(this.graph.link(this, accessor) as Link<Root, Accessor>);
        return this;
    }
    public removeAccessor(accessor: Accessor): Root {
        const link = this.accessors.find((link) => link.getRight() === accessor);
        link.dispose();
        return this;
    }
    public listAccessors(): Accessor[] {
        return this.accessors.map((p) => p.getRight());
    }

    public dispose(): void {
        while (this.scenes.length > 0) this.scenes[0].dispose();
        while (this.nodes.length > 0) this.nodes[0].dispose();
        while (this.meshes.length > 0) this.meshes[0].dispose();
        while (this.materials.length > 0) this.materials[0].dispose();
        while (this.textures.length > 0) this.textures[0].dispose();
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
    private nodes: Link<Scene, Node>[] = [];
    public addNode(node: Node): Scene {
        this.nodes.push(this.graph.link(this, node) as Link<Scene, Node>);
        return this;
    }
    public removeNode(node: Node): Scene {
        const link = this.nodes.find((link) => link.getRight() === node);
        link.dispose();
        return this;
    }
    public listNodes(): Node[] {
        return this.nodes.map((p) => p.getRight());
    }
    public dispose(): void {
        while (this.nodes.length > 0) this.nodes[0].dispose();
        super.dispose();
    }
    public disconnect(link: Link<Scene, Node>): Scene {
        this.nodes = this.nodes.filter((child) => child !== link);
        return this;
    }
}

export class Mesh extends Element {
    private primitives: Link<Mesh, Primitive>[] = [];
    public addPrimitive(primitive: Primitive): Mesh {
        this.primitives.push(this.graph.link(this, primitive) as Link<Mesh, Primitive>);
        return this;
    }
    public removePrimitive(primitive: Primitive): Mesh {
        const link = this.primitives.find((link) => link.getRight() === primitive);
        link.dispose();
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
        while (this.primitives.length > 0) this.primitives[0].dispose();
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
    public setIndices(indices: Accessor): Primitive {
        if (this.indices) {
            this.indices.dispose();
        }
        this.indices = this.graph.link(this, indices) as Link<Primitive, Accessor>;
        return this;
    }
    public getAttribute(semantic: string): Accessor {
        return this.attributes[semantic] ? this.attributes[semantic].getRight() : null;
    }
    public setAttribute(semantic: string, accessor: Accessor): Primitive {
        if (this.attributes[semantic]) {
            this.attributes[semantic].dispose();
        }
        this.attributes[semantic] = this.graph.link(this, accessor) as Link<Primitive, Accessor>;
        return this;
    }
    public listAttributes(): Accessor[] {
        return Object.values(this.attributes).map((link) => link.getRight());
    }
    public listTargets(): Accessor[][] {
        return this.targets.map((target) => Object.values(target).map((link) => link.getRight()));
    }
    public listTargetNames(): string[] { return this.targetNames; }
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

    public disconnect(link: Link<Accessor, Element>): Accessor {
        throw new Error('Type "Accessor" has no outbound links.');
    }

    public dispose(): void {
        throw NOT_IMPLEMENTED;
        super.dispose();
    }
}

export class Node extends Element {
    private translation = new Vector3();
    private rotation = new Vector4();
    private scale = new Vector3();

    private mesh: Link<Node, Mesh> = null;
    private children: Link<Node, Node>[] = [];

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
        const link = this.graph.link(this, child) as Link<Node, Node>;
        this.children.push(link);
        return this;
    }
    public listChildren(): Node[] {
        return this.children.map((link) => link.getRight());
    }
    public setMesh(mesh: Mesh): Node {
        if (this.mesh) {
            this.mesh.dispose();
        }
        if (mesh) {
            this.mesh = this.graph.link(this, mesh) as Link<Node, Mesh>;
        }
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
    private baseColorTexture: TextureLink = null;
    private emissiveFactor: Vector3 = new Vector3(0, 0, 0);
    private emissiveTexture: TextureLink = null;

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
        if (this.baseColorTexture) {
            this.baseColorTexture.dispose();
        }
        if (texture) {
            this.baseColorTexture = this.graph.linkTexture(this, texture);
        }
        return this;
    }
    public setEmissiveTexture(texture: Texture): Material {
        if (this.emissiveTexture) {
            this.emissiveTexture.dispose();
        }
        if (texture) {
            this.emissiveTexture = this.graph.linkTexture(this, texture);
        }
        return this;
    }

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

    public disconnect(link: Link<Texture, Element>): Texture {
        throw NOT_IMPLEMENTED;
    }

    public dispose(): void {
        throw NOT_IMPLEMENTED;
        super.dispose();
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

/***************************************************************
 * Archive
 */
