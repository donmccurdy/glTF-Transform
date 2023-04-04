import test from 'ava';
import { Document, Extension, ExtensionProperty, PropertyType, WriterContext } from '@gltf-transform/core';
import { createPlatformIO } from '@gltf-transform/test-utils';

const EXTENSION_NAME = 'TEST_node_gizmo';

class GizmoExtension extends Extension {
	static EXTENSION_NAME = EXTENSION_NAME;
	public extensionName = EXTENSION_NAME;
	createGizmo() {
		return new Gizmo(this.document.getGraph());
	}
	write(context: WriterContext): this {
		for (const node of this.document.getRoot().listNodes()) {
			if (node.getExtension(EXTENSION_NAME)) {
				const nodeDef = context.jsonDoc.json.nodes[context.nodeIndexMap.get(node)];
				nodeDef.extensions = { TEST_node_gizmo: { isGizmo: true } };
			}
		}
		return this;
	}
	read(context) {
		context.jsonDoc.json.nodes.forEach((nodeDef, index) => {
			const extensionDef = nodeDef.extensions && nodeDef.extensions.TEST_node_gizmo;
			if (!extensionDef || !extensionDef.isGizmo) return;
			const extension = this.document.createExtension(GizmoExtension) as GizmoExtension;
			context.nodes[index].setExtension(EXTENSION_NAME, extension.createGizmo());
		});
		return this;
	}
}

class Gizmo extends ExtensionProperty {
	declare extensionName: typeof EXTENSION_NAME;
	declare propertyType: 'Gizmo';
	declare parentTypes: [PropertyType.NODE];
	init(): void {
		this.extensionName = EXTENSION_NAME;
		this.propertyType = 'Gizmo';
		this.parentTypes = [PropertyType.NODE];
	}
}

GizmoExtension.EXTENSION_NAME = EXTENSION_NAME;
Gizmo.EXTENSION_NAME = EXTENSION_NAME;

test('list', (t) => {
	const document = new Document();
	const extension = document.createExtension(GizmoExtension);

	t.deepEqual(document.getRoot().listExtensionsUsed(), [extension], 'listExtensionsUsed()');
	t.deepEqual(document.getRoot().listExtensionsRequired(), [], 'listExtensionsRequired()');

	extension.setRequired(true);
	t.deepEqual(document.getRoot().listExtensionsRequired(), [extension], 'listExtensionsRequired()');

	extension.dispose();
	t.deepEqual(document.getRoot().listExtensionsUsed(), [], 'listExtensionsUsed()');
	t.deepEqual(document.getRoot().listExtensionsRequired(), [], 'listExtensionsRequired()');
});

test('property', (t) => {
	const document = new Document();
	const extension = document.createExtension(GizmoExtension) as GizmoExtension;
	const gizmo = extension.createGizmo();
	const node = document.createNode('MyNode');

	t.is(node.getExtension(EXTENSION_NAME), null, 'getExtension() → null (1)');

	// Add ExtensionProperty.

	node.setExtension(EXTENSION_NAME, gizmo);
	t.is(node.getExtension(EXTENSION_NAME), gizmo, 'getExtension() → gizmo');
	t.deepEqual(node.listExtensions(), [gizmo], 'listExtensions() → [gizmo x1]');

	// Remove ExtensionProperty.

	node.setExtension(EXTENSION_NAME, null);
	t.is(node.getExtension(EXTENSION_NAME), null, 'getExtension() → null (2)');

	// Dispose ExtensionProperty.

	node.setExtension(EXTENSION_NAME, gizmo);
	gizmo.dispose();
	t.is(node.getExtension(EXTENSION_NAME), null, 'getExtension() → null (3)');

	// Dispose Extension.

	node.setExtension(EXTENSION_NAME, extension.createGizmo());
	extension.dispose();
	t.is(node.getExtension(EXTENSION_NAME), null, 'getExtension() → null (4)');
});

test('i/o', async (t) => {
	const io = (await createPlatformIO()).registerExtensions([GizmoExtension]);
	const document = new Document();
	const extension = document.createExtension(GizmoExtension) as GizmoExtension;
	document.createNode().setExtension(EXTENSION_NAME, extension.createGizmo());

	const options = { basename: 'extensionTest' };

	let jsonDoc;
	let resultDoc;

	// Write (unregistered).

	jsonDoc = await (await createPlatformIO()).writeJSON(document, options);
	t.deepEqual(jsonDoc.json.extensionsUsed, undefined, 'write extensionsUsed (unregistered)');

	// Write (registered).

	jsonDoc = await io.writeJSON(document, options);
	t.deepEqual(jsonDoc.json.extensionsUsed, ['TEST_node_gizmo'], 'write extensionsUsed (registered)');
	t.is(jsonDoc.json.extensionsRequired, undefined, 'omit extensionsRequired');
	t.is(jsonDoc.json.nodes[0].extensions.TEST_node_gizmo.isGizmo, true, 'extend node');

	// Read.

	resultDoc = await io.readJSON(jsonDoc);
	t.deepEqual(
		resultDoc
			.getRoot()
			.listExtensionsUsed()
			.map((ext) => ext.extensionName),
		['TEST_node_gizmo'],
		'roundtrip extensionsUsed'
	);
	t.deepEqual(resultDoc.getRoot().listExtensionsRequired(), [], 'roundtrip omit extensionsRequired');
	t.is(
		resultDoc.getRoot().listNodes()[0].getExtension(EXTENSION_NAME).extensionName,
		'TEST_node_gizmo',
		'roundtrip extend node'
	);

	// Write + read with extensionsRequired.

	extension.setRequired(true);
	jsonDoc = await io.writeJSON(document, options);
	t.deepEqual(jsonDoc.json.extensionsRequired, ['TEST_node_gizmo'], 'write extensionsRequired');
	resultDoc = await io.readJSON(jsonDoc);
	t.deepEqual(
		resultDoc
			.getRoot()
			.listExtensionsRequired()
			.map((ext) => ext.extensionName),
		['TEST_node_gizmo'],
		'roundtrip extensionsRequired'
	);
});

test('clone', (t) => {
	const document = new Document();
	const extension = document.createExtension(GizmoExtension) as GizmoExtension;
	const gizmo = extension.createGizmo();
	document.createNode().setExtension(EXTENSION_NAME, gizmo);

	let docClone: Document;
	t.truthy(gizmo.clone(), 'clones gizmo');
	t.truthy((docClone = document.clone()), 'clones document');
	t.truthy(docClone.getRoot().listNodes()[0].getExtension(EXTENSION_NAME), 'preserves gizmo');
});
