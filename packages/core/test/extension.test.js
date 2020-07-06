require('source-map-support').install();

const fs = require('fs');
const path = require('path');
const test = require('tape');
const { Document, Extension, ExtensionProperty, NodeIO, PropertyType } = require('../');

const EXTENSION_NAME = 'TEST_node_gizmo';

class GizmoExtension extends Extension {
	constructor(doc) {
		super(doc);
		this.extensionName = EXTENSION_NAME;
	}

	createGizmo() {
		return new Gizmo(this.doc.getGraph(), this);
	}

	write(context) {
		for (const node of this.doc.getRoot().listNodes()) {
			if (node.getExtension(Gizmo)) {
				const nodeDef = context.nativeDocument.json.nodes[context.nodeIndexMap.get(node)];
				nodeDef.extensions = {TEST_node_gizmo: {isGizmo: true}};
			}
		}
	}

	read(context) {
		context.nativeDocument.json.nodes.forEach((nodeDef, index) => {
			const extensionDef = nodeDef.extensions && nodeDef.extensions.TEST_node_gizmo;
			if (!extensionDef || !extensionDef.isGizmo) return;
			const extension = this.doc.createExtension(GizmoExtension);
			context.nodes[index].setExtension(Gizmo, extension.createGizmo());
		});
	}
}

class Gizmo extends ExtensionProperty {
	constructor(graph, extension) {
		super(graph, extension);
		this.extensionName = EXTENSION_NAME;
		this.propertyType = 'Gizmo';
		this.parentTypes = [PropertyType.NODE];
	}
}

GizmoExtension.EXTENSION_NAME = EXTENSION_NAME;
Gizmo.EXTENSION_NAME = EXTENSION_NAME;

test('@gltf-transform/core::extension | list', t => {
	const doc = new Document();
	const extension = doc.createExtension(GizmoExtension);

	t.deepEqual(doc.getRoot().listExtensionsUsed(), [extension], 'listExtensionsUsed()');
	t.deepEqual(doc.getRoot().listExtensionsRequired(), [], 'listExtensionsRequired()');

	extension.setRequired(true);
	t.deepEqual(doc.getRoot().listExtensionsRequired(), [extension], 'listExtensionsRequired()');

	extension.dispose();
	t.deepEqual(doc.getRoot().listExtensionsUsed(), [], 'listExtensionsUsed()');
	t.deepEqual(doc.getRoot().listExtensionsRequired(), [], 'listExtensionsRequired()');

	t.end();
});

test('@gltf-transform/core::extension | property', t => {
	const doc = new Document();
	const extension = doc.createExtension(GizmoExtension);
	const gizmo = extension.createGizmo();
	const node = doc.createNode();

	t.equal(node.getExtension(Gizmo), null, 'getExtension() → null (1)');

	// Add ExtensionProperty.

	node.setExtension(Gizmo, gizmo);
	t.equal(node.getExtension(Gizmo), gizmo, 'getExtension() → gizmo');
	t.deepEqual(node.listExtensions(), [gizmo], 'listExtensions() → [gizmo x1]');

	// Remove ExtensionProperty.

	node.setExtension(Gizmo, null);
	t.equal(node.getExtension(Gizmo), null, 'getExtension() → null (2)');

	// Dispose ExtensionProperty.

	node.setExtension(Gizmo, gizmo);
	gizmo.dispose();
	t.equal(node.getExtension(Gizmo), null, 'getExtension() → null (3)');

	// Dispose Extension.

	node.setExtension(Gizmo, extension.createGizmo());
	extension.dispose();
	t.equal(node.getExtension(Gizmo), null, 'getExtension() → null (4)');

	t.end();
});


test('@gltf-transform/core::extension | i/o', t => {
	const io = new NodeIO(fs, path).registerExtensions([GizmoExtension]);
	const doc = new Document();
	const extension = doc.createExtension(GizmoExtension);
	doc.createNode().setExtension(Gizmo, extension.createGizmo());

	const options = {basename: 'extensionTest'};

	let nativeDoc;
	let resultDoc;

	// Write.

	nativeDoc = io.createNativeDocument(doc, options);
	t.deepEqual(nativeDoc.json.extensionsUsed, ['TEST_node_gizmo'], 'write extensionsUsed');
	t.equal(nativeDoc.json.extensionsRequired, undefined, 'omit extensionsRequired');
	t.equal(nativeDoc.json.nodes[0].extensions.TEST_node_gizmo.isGizmo, true, 'extend node');

	// Read.

	resultDoc = io.createDocument(nativeDoc);
	t.deepEqual(
		resultDoc.getRoot().listExtensionsUsed().map((ext) => ext.extensionName),
		['TEST_node_gizmo'],
		'roundtrip extensionsUsed'
	);
	t.deepEqual(resultDoc.getRoot().listExtensionsRequired(), [], 'roundtrip omit extensionsRequired');
	t.equal(resultDoc.getRoot().listNodes()[0].getExtension(Gizmo).extensionName, 'TEST_node_gizmo', 'roundtrip extend node');

	// Write + read with extensionsRequired.

	extension.setRequired(true);
	nativeDoc = io.createNativeDocument(doc, options);
	t.deepEqual(nativeDoc.json.extensionsRequired, ['TEST_node_gizmo'], 'write extensionsRequired');
	resultDoc = io.createDocument(nativeDoc);
	t.deepEqual(
		resultDoc.getRoot().listExtensionsRequired().map((ext) => ext.extensionName),
		['TEST_node_gizmo'],
		'roundtrip extensionsRequired'
	);

	t.end();
});
