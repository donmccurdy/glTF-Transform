import { Document, NodeIO } from '@gltf-transform/core';
import { KHRNodeVisibility, type Visibility } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';
import test from 'ava';

const WRITER_OPTIONS = { basename: 'extensionTest' };

test('basic', async (t) => {
	const document = new Document();
	const visibilityExtension = document.createExtension(KHRNodeVisibility);
	const visibility = visibilityExtension.createVisibility().setVisible(false);

	const node = document.createNode('MyNode').setExtension('KHR_node_visibility', visibility);

	t.is(node.getExtension('KHR_node_visibility'), visibility, 'visibility is attached');

	const jsonDoc = await new NodeIO().registerExtensions([KHRNodeVisibility]).writeJSON(document, WRITER_OPTIONS);
	const nodeDef = jsonDoc.json.nodes[0];

	t.deepEqual(nodeDef.extensions, { KHR_node_visibility: { visible: false } }, 'writes visibility extension');
	t.deepEqual(jsonDoc.json.extensionsUsed, [KHRNodeVisibility.EXTENSION_NAME], 'writes extensionsUsed');

	visibilityExtension.dispose();
	t.is(node.getExtension('KHR_node_visibility'), null, 'visibility is detached');

	const roundtripDoc = await new NodeIO().registerExtensions([KHRNodeVisibility]).readJSON(jsonDoc);
	const roundtripNode = roundtripDoc.getRoot().listNodes().pop();

	t.is(roundtripNode.getExtension<Visibility>('KHR_node_visibility').getVisible(), false, 'reads visibility');
});

test('copy', (t) => {
	const document = new Document();
	const visibilityExtension = document.createExtension(KHRNodeVisibility);
	const visibility = visibilityExtension.createVisibility().setVisible(false);
	document.createNode().setExtension('KHR_node_visibility', visibility);

	const document2 = cloneDocument(document);
	const visibility2 = document2.getRoot().listNodes()[0].getExtension<Visibility>('KHR_node_visibility');
	t.is(document2.getRoot().listExtensionsUsed().length, 1, 'copy KHRNodeVisibility');
	t.truthy(visibility2, 'copy Visibility');
	t.is(visibility2.getVisible(), false, 'copy visibility');
});
