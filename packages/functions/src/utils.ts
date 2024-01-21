import type { NdArray } from 'ndarray';
import { getPixels, savePixels } from 'ndarray-pixels';
import {
	Accessor,
	Document,
	Primitive,
	Property,
	PropertyType,
	Texture,
	Transform,
	TransformContext,
	TypedArray,
	vec2,
} from '@gltf-transform/core';
import { cleanPrimitive } from './clean-primitive.js';

/**
 * Prepares a function used in an {@link Document.transform} pipeline. Use of this wrapper is
 * optional, and plain functions may be used in transform pipelines just as well. The wrapper is
 * used internally so earlier pipeline stages can detect and optimize based on later stages.
 * @hidden
 */
export function createTransform(name: string, fn: Transform): Transform {
	Object.defineProperty(fn, 'name', { value: name });
	return fn;
}

/** @hidden */
export function isTransformPending(context: TransformContext | undefined, initial: string, pending: string): boolean {
	if (!context) return false;
	const initialIndex = context.stack.lastIndexOf(initial);
	const pendingIndex = context.stack.lastIndexOf(pending);
	return initialIndex < pendingIndex;
}

/**
 * Maps pixels from source to target textures, with a per-pixel callback.
 * @hidden
 */
export async function rewriteTexture(
	source: Texture,
	target: Texture,
	fn: (pixels: NdArray, i: number, j: number) => void,
): Promise<Texture | null> {
	if (!source) return null;

	const srcImage = source.getImage();
	if (!srcImage) return null;

	const pixels = await getPixels(srcImage, source.getMimeType());

	for (let i = 0; i < pixels.shape[0]; ++i) {
		for (let j = 0; j < pixels.shape[1]; ++j) {
			fn(pixels, i, j);
		}
	}

	const dstImage = await savePixels(pixels, 'image/png');
	return target.setImage(dstImage).setMimeType('image/png');
}

/** @hidden */
export function getGLPrimitiveCount(prim: Primitive): number {
	const indices = prim.getIndices();
	const position = prim.getAttribute('POSITION')!;

	// Reference: https://www.khronos.org/opengl/wiki/Primitive
	switch (prim.getMode()) {
		case Primitive.Mode.POINTS:
			return position.getCount();
		case Primitive.Mode.LINES:
			return indices ? indices.getCount() / 2 : position.getCount() / 2;
		case Primitive.Mode.LINE_LOOP:
			return position.getCount();
		case Primitive.Mode.LINE_STRIP:
			return position.getCount() - 1;
		case Primitive.Mode.TRIANGLES:
			return indices ? indices.getCount() / 3 : position.getCount() / 3;
		case Primitive.Mode.TRIANGLE_STRIP:
		case Primitive.Mode.TRIANGLE_FAN:
			return position.getCount() - 2;
		default:
			throw new Error('Unexpected mode: ' + prim.getMode());
	}
}

/** @hidden */
export class SetMap<K, V> {
	private _map = new Map<K, Set<V>>();
	public get size(): number {
		return this._map.size;
	}
	public has(k: K): boolean {
		return this._map.has(k);
	}
	public add(k: K, v: V): this {
		let entry = this._map.get(k);
		if (!entry) {
			entry = new Set();
			this._map.set(k, entry);
		}
		entry.add(v);
		return this;
	}
	public get(k: K): Set<V> {
		return this._map.get(k) || new Set();
	}
	public keys(): Iterable<K> {
		return this._map.keys();
	}
}

/** @hidden */
export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1000;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/** @hidden */
export function formatLong(x: number): string {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** @hidden */
export function formatDelta(a: number, b: number, decimals = 2): string {
	const prefix = a > b ? '–' : '+';
	const suffix = '%';
	return prefix + ((Math.abs(a - b) / a) * 100).toFixed(decimals) + suffix;
}

/** @hidden */
export function formatDeltaOp(a: number, b: number) {
	return `${formatLong(a)} → ${formatLong(b)} (${formatDelta(a, b)})`;
}

/**
 * Returns a list of all unique vertex attributes on the given primitive and
 * its morph targets.
 * @hidden
 */
export function deepListAttributes(prim: Primitive): Accessor[] {
	const accessors: Accessor[] = [];

	for (const attribute of prim.listAttributes()) {
		accessors.push(attribute);
	}
	for (const target of prim.listTargets()) {
		for (const attribute of target.listAttributes()) {
			accessors.push(attribute);
		}
	}

	return Array.from(new Set(accessors));
}

/** @hidden */
export function deepSwapAttribute(prim: Primitive, src: Accessor, dst: Accessor): void {
	prim.swap(src, dst);
	for (const target of prim.listTargets()) {
		target.swap(src, dst);
	}
}

/** @hidden */
export function shallowEqualsArray(a: ArrayLike<unknown> | null, b: ArrayLike<unknown> | null) {
	if (a == null && b == null) return true;
	if (a == null || b == null) return false;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

/** Clones an {@link Accessor} without creating a copy of its underlying TypedArray data. */
export function shallowCloneAccessor(document: Document, accessor: Accessor): Accessor {
	return document
		.createAccessor(accessor.getName())
		.setArray(accessor.getArray())
		.setType(accessor.getType())
		.setBuffer(accessor.getBuffer())
		.setNormalized(accessor.getNormalized())
		.setSparse(accessor.getSparse());
}

export function remapPrimitive(prim: Primitive, remap: TypedArray, dstVertexCount: number): Primitive {
	const document = Document.fromGraph(prim.getGraph())!;

	// Remap indices.

	const srcVertexCount = prim.getAttribute('POSITION')!.getCount();
	const srcIndices = prim.getIndices();
	const srcIndicesArray = srcIndices ? srcIndices.getArray() : null;
	const dstIndices = document.createAccessor();
	const dstIndicesCount = srcIndices ? srcIndices.getCount() : srcVertexCount; // primitive count does not change.
	const dstIndicesArray = createIndices(dstIndicesCount, dstVertexCount);
	for (let i = 0; i < dstIndicesCount; i++) {
		dstIndicesArray[i] = remap[srcIndicesArray ? srcIndicesArray[i] : i];
	}
	prim.setIndices(dstIndices.setArray(dstIndicesArray));

	// Remap vertices.

	const srcAttributes = deepListAttributes(prim);
	for (const srcAttribute of prim.listAttributes()) {
		const dstAttribute = shallowCloneAccessor(document, srcAttribute);
		prim.swap(srcAttribute, remapAttribute(dstAttribute, remap, dstVertexCount));
		if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
	}
	for (const target of prim.listTargets()) {
		for (const srcAttribute of target.listAttributes()) {
			const dstAttribute = shallowCloneAccessor(document, srcAttribute);
			target.swap(srcAttribute, remapAttribute(dstAttribute, remap, dstVertexCount));
			if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
		}
	}

	// Clean up accessors.

	if (srcIndices && srcIndices.listParents().length === 1) srcIndices.dispose();
	for (const srcAttribute of srcAttributes) {
		if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
	}

	// Clean up degenerate topology.

	cleanPrimitive(prim);

	return prim;
}

/** @hidden */
export function remapAttribute(
	srcAttribute: Accessor,
	remap: TypedArray,
	dstCount: number,
	dstAttribute = srcAttribute,
): Accessor {
	const elementSize = srcAttribute.getElementSize();
	const srcCount = srcAttribute.getCount();
	const srcArray = srcAttribute.getArray()!;
	// prettier-ignore
	const dstArray = dstAttribute === srcAttribute
		? srcArray.slice(0, dstCount * elementSize)
		: dstAttribute.getArray()!;
	const done = new Uint8Array(dstCount);

	for (let srcIndex = 0; srcIndex < srcCount; srcIndex++) {
		const dstIndex = remap[srcIndex];
		if (done[dstIndex]) continue;
		for (let j = 0; j < elementSize; j++) {
			dstArray[dstIndex * elementSize + j] = srcArray[srcIndex * elementSize + j];
		}
		done[dstIndex] = 1;
	}

	return srcAttribute.setArray(dstArray);
}

/** @hidden */
export function createIndices(count: number, maxIndex = count): Uint16Array | Uint32Array {
	const array = maxIndex <= 65534 ? new Uint16Array(count) : new Uint32Array(count);
	for (let i = 0; i < array.length; i++) array[i] = i;
	return array;
}

/** @hidden */
export function isUsed(prop: Property): boolean {
	return prop.listParents().some((parent) => parent.propertyType !== PropertyType.ROOT);
}

/**
 * Creates a unique key associated with the structure and draw call characteristics of
 * a {@link Primitive}, independent of its vertex content. Helper method, used to
 * identify candidate Primitives for joining.
 * @hidden
 */
export function createPrimGroupKey(prim: Primitive): string {
	const document = Document.fromGraph(prim.getGraph())!;
	const material = prim.getMaterial();
	const materialIndex = document.getRoot().listMaterials().indexOf(material!);
	const mode = prim.getMode();
	const indices = !!prim.getIndices();

	const attributes = prim
		.listSemantics()
		.sort()
		.map((semantic) => {
			const attribute = prim.getAttribute(semantic)!;
			const elementSize = attribute.getElementSize();
			const componentType = attribute.getComponentType();
			return `${semantic}:${elementSize}:${componentType}`;
		})
		.join('+');

	const targets = prim
		.listTargets()
		.map((target) => {
			return target
				.listSemantics()
				.sort()
				.map((semantic) => {
					const attribute = prim.getAttribute(semantic)!;
					const elementSize = attribute.getElementSize();
					const componentType = attribute.getComponentType();
					return `${semantic}:${elementSize}:${componentType}`;
				})
				.join('+');
		})
		.join('~');

	return `${materialIndex}|${mode}|${indices}|${attributes}|${targets}`;
}

/** @hidden */
export function fitWithin(size: vec2, limit: vec2): vec2 {
	const [maxWidth, maxHeight] = limit;
	const [srcWidth, srcHeight] = size;

	if (srcWidth <= maxWidth && srcHeight <= maxHeight) return size;

	let dstWidth = srcWidth;
	let dstHeight = srcHeight;

	if (dstWidth > maxWidth) {
		dstHeight = Math.floor(dstHeight * (maxWidth / dstWidth));
		dstWidth = maxWidth;
	}

	if (dstHeight > maxHeight) {
		dstWidth = Math.floor(dstWidth * (maxHeight / dstHeight));
		dstHeight = maxHeight;
	}

	return [dstWidth, dstHeight];
}

type ResizePreset = 'nearest-pot' | 'ceil-pot' | 'floor-pot';

/** @hidden */
export function fitPowerOfTwo(size: vec2, method: ResizePreset): vec2 {
	if (isPowerOfTwo(size[0]) && isPowerOfTwo(size[1])) {
		return size;
	}

	switch (method) {
		case 'nearest-pot':
			return size.map(nearestPowerOfTwo) as vec2;
		case 'ceil-pot':
			return size.map(ceilPowerOfTwo) as vec2;
		case 'floor-pot':
			return size.map(floorPowerOfTwo) as vec2;
	}
}

function isPowerOfTwo(value: number): boolean {
	if (value <= 2) return true;
	return (value & (value - 1)) === 0 && value !== 0;
}

function nearestPowerOfTwo(value: number): number {
	if (value <= 4) return 4;

	const lo = floorPowerOfTwo(value);
	const hi = ceilPowerOfTwo(value);

	if (hi - value > value - lo) return lo;
	return hi;
}

export function floorPowerOfTwo(value: number): number {
	return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
}

export function ceilPowerOfTwo(value: number): number {
	return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}
