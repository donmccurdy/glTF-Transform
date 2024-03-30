import { Document, Logger, Mesh, Node, Scene } from '@gltf-transform/core';

export const LOGGER = new Logger(Logger.Verbosity.SILENT);

/******************************************************************************
 * PROPERTY CONSTRUCTORS
 */

export function createLargeDocument(rootNodeCount: number): Document {
	const document = new Document().setLogger(LOGGER);
	createSubtree(document, document.createScene('Scene'), rootNodeCount);
	return document;
}

export function createSubtree<T extends Node | Scene>(document: Document, parent: T, childCount: number): T {
	if (childCount > 4 || parent instanceof Scene) {
		for (let i = 0; i < childCount; i++) {
			parent.addChild(createSubtree(document, document.createNode(), childCount / 4));
		}
		return parent;
	}
	return parent.setMesh(createMesh(document)) as T;
}

export function createMesh(document: Document): Mesh {
	const position = document.createAccessor().setArray(new Float32Array(30)).setType('VEC3');
	const normal = document.createAccessor().setArray(new Float32Array(30)).setType('VEC3');
	const material = document.createMaterial();
	const prim = document
		.createPrimitive()
		.setAttribute('POSITION', position)
		.setAttribute('NORMAL', normal)
		.setMaterial(material);
	return document.createMesh().addPrimitive(prim);
}

/******************************************************************************
 * REPORTING
 */

export function max(values: number[]): number {
	let max = -Infinity;
	for (const value of values) max = Math.max(max, value);
	return max;
}

export function formatTime(ms: number): string {
	return `${formatLong(ms)} ms`;
}

export function formatLong(x: number): string {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function underline(str: string): string {
	return `\x1b[4m${str}\x1b[0m`;
}

export function dim(str: string): string {
	return `\x1b[2m${str}\x1b[0m`;
}

export function bright(str: string): string {
	return `\x1b[1m${str}\x1b[0m`;
}
