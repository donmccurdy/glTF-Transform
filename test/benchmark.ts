import { Bench } from 'tinybench';
import { Document, Mesh, Node, Scene } from '@gltf-transform/core';

/**
 * DEVELOPER NOTES:
 *
 * Started out with benchmark.js, but quickly hit some frustrating issues.
 * Async is difficult. Setup functions are serialized and can't access scope.
 * Options on the Suite appear to do nothing. Switched to tinybench.
 */

/******************************************************************************
 * CONSTANTS
 */

enum Size {
	SM = 32,
	MD = 64,
	LG = 128,
}

interface IResult {
	name: string;
	value: number;
	unit: string;
}

/******************************************************************************
 * BENCHMARK SUITE
 */

let _document: Document;

const bench = new Bench({ time: 1000 })
	.add('create::sm', () => createLargeDocument(Size.SM))
	.add('create::md', () => createLargeDocument(Size.MD))
	.add('clone::sm', () => _document.clone(), { beforeAll: () => void (_document = createLargeDocument(Size.SM)) })
	.add('clone::md', () => _document.clone(), { beforeAll: () => void (_document = createLargeDocument(Size.MD)) })
	.add(
		'dispose::md',
		() => {
			const nodes = _document.getRoot().listNodes();
			for (let i = 0, il = Math.min(nodes.length, 100); i < il; i++) {
				nodes[i].dispose();
			}
		},
		{
			beforeEach: () => {
				_document = createLargeDocument(Size.MD);
			},
		},
	);

/******************************************************************************
 * UTILITIES
 */

function createLargeDocument(rootNodeCount: number): Document {
	const document = new Document();
	createSubtree(document, document.createScene('Scene'), rootNodeCount);
	return document;
}

function createSubtree<T extends Node | Scene>(document: Document, parent: T, childCount: number): T {
	if (childCount > 4 || parent instanceof Scene) {
		for (let i = 0; i < childCount; i++) {
			parent.addChild(createSubtree(document, document.createNode(), childCount / 4));
		}
		return parent;
	}
	return parent.setMesh(createMesh(document)) as T;
}

function createMesh(document: Document): Mesh {
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
 * EXECUTE
 */

await bench.run();

const results: IResult[] = [];
for (const task of bench.tasks) {
	results.push({
		name: task.name,
		value: Number(task.result!.mean.toFixed(4)),
		unit: 'ms',
	});
}

console.log(JSON.stringify(results, null, 2));
