require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { Packet, KHRXMP } from '../';

const MOCK_CONTEXT_URL = 'https://test.example/1.0/';

const MOCK_JSONLD_PACKET = {
	'@context': {
		dc: 'http://purl.org/dc/elements/1.1/',
		rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
		xmpRights: 'http://ns.adobe.com/xap/1.0/rights/',
	},
	'dc:title': {
		'@type': 'rdf:Alt',
		'rdf:_1': {
			'@language': 'en-US',
			'@value': 'My Model',
		},
	},
	'xmpRights:Marked': true,
};

test('@gltf-transform/extensions::xmp', async (t) => {
	const document = new Document();
	const xmpExtension = document.createExtension(KHRXMP);
	const packet = xmpExtension.createPacket();

	// Context.
	t.throws(() => packet.setProperty('test:Foo', true), /context/i, 'throws on unknown context');
	packet.setContext({ test: MOCK_CONTEXT_URL });
	t.deepEquals(packet.getContext(), { test: MOCK_CONTEXT_URL }, 'sets context');
	packet.setContext({});
	t.deepEquals(packet.getContext(), {}, 'removes context');
	packet.setContext({
		test: MOCK_CONTEXT_URL,
		dc: 'http://purl.org/dc/elements/1.1/',
	});
	t.doesNotThrow(() => packet.setProperty('test:Foo', true), 'accepts known context');

	// Properties.
	t.equals(packet.getProperty('test:Foo'), true, 'sets literal property');
	packet.setProperty('dc:Creator', { '@list': ['Acme, Inc.'] });
	t.deepEquals(packet.getProperty('dc:Creator'), { '@list': ['Acme, Inc.'] }, 'sets RDF property');
	t.deepEquals(packet.listProperties(), ['test:Foo', 'dc:Creator'], 'lists properties');
	packet.setProperty('dc:Creator', null);
	t.equals(packet.getProperty('dc:Creator'), null, 'removes property');
	packet.setProperty('dc:Creator', { '@list': ['Acme, Inc.'] });

	// Serialize.
	t.deepEquals(
		packet.toJSONLD(),
		{
			'@context': {
				dc: 'http://purl.org/dc/elements/1.1/',
				test: MOCK_CONTEXT_URL,
			},
			'test:Foo': true,
			'dc:Creator': { '@list': ['Acme, Inc.'] },
		},
		'serialize to JSON LD'
	);

	// Deserialize.
	packet.fromJSONLD(MOCK_JSONLD_PACKET);
	t.equals(packet.getProperty('xmpRights:Marked'), true, 'parse JSON LD (1/2)');
	t.deepEquals(packet.getProperty('dc:title'), MOCK_JSONLD_PACKET['dc:title'], 'parse JSON LD (2/2)');

	// Equals and Copy.
	const packet2 = xmpExtension.createPacket();
	t.notOk(packet.equals(packet2), 'not equal');
	packet2.copy(packet);
	t.ok(packet.equals(packet2), 'not equal');
	packet2.setContext({
		...packet2.getContext(),
		xmp: 'http://ns.adobe.com/xap/1.0/',
	});
	packet2.setProperty('xmp:CreateDate', '2022-01-05');
	t.notOk(packet.equals(packet2), 'not equal');

	// Assignment.
	const root = document.getRoot();
	const node = document.createNode();
	const scene = document.createScene();
	const mesh = document.createMesh();
	const material = document.createMaterial();
	const texture = document.createTexture();
	const animation = document.createAnimation();
	const sampler = document.createAnimationSampler(); // invalid
	t.doesNotThrow(() => root.setExtension('KHR_xmp_json_ld', packet), 'attach to root');
	t.doesNotThrow(() => node.setExtension('KHR_xmp_json_ld', packet), 'attach to node');
	t.doesNotThrow(() => scene.setExtension('KHR_xmp_json_ld', packet), 'attach to scene');
	t.doesNotThrow(() => mesh.setExtension('KHR_xmp_json_ld', packet), 'attach to mesh');
	t.doesNotThrow(() => material.setExtension('KHR_xmp_json_ld', packet), 'attach to material');
	t.doesNotThrow(() => texture.setExtension('KHR_xmp_json_ld', packet), 'attach to texture');
	t.doesNotThrow(() => animation.setExtension('KHR_xmp_json_ld', packet), 'attach to animation');
	t.throws(() => sampler.setExtension('KHR_xmp_json_ld', packet), 'attach to sampler (throws)');
	t.ok(root.getExtension('KHR_xmp_json_ld'), 'read from root');
	t.ok(node.getExtension('KHR_xmp_json_ld'), 'read from node');
	t.ok(scene.getExtension('KHR_xmp_json_ld'), 'read from scene');
	t.ok(mesh.getExtension('KHR_xmp_json_ld'), 'read from mesh');
	t.ok(material.getExtension('KHR_xmp_json_ld'), 'read from material');
	t.ok(texture.getExtension('KHR_xmp_json_ld'), 'read from texture');
	t.ok(animation.getExtension('KHR_xmp_json_ld'), 'read from animation');
	t.notOk(sampler.getExtension('KHR_xmp_json_ld'), 'read from sampler (null)');

	// (5) dispose
	packet.dispose();
	t.notOk(root.getExtension('KHR_xmp_json_ld'), 'dispose from root');
	t.notOk(node.getExtension('KHR_xmp_json_ld'), 'dispose from node');

	t.end();
});

test('@gltf-transform/extensions::xmp | i/o', async (t) => {
	const document = new Document();
	const xmpExtension = document.createExtension(KHRXMP);
	const packet = xmpExtension.createPacket().fromJSONLD(MOCK_JSONLD_PACKET);
	const packet2 = xmpExtension.createPacket().fromJSONLD(MOCK_JSONLD_PACKET);

	const root = document.getRoot();
	root.setExtension('KHR_xmp_json_ld', packet);
	document.createNode().setExtension('KHR_xmp_json_ld', packet2);
	document.createScene().setExtension('KHR_xmp_json_ld', packet2);
	document.createMesh().setExtension('KHR_xmp_json_ld', packet2);
	document.createMaterial().setExtension('KHR_xmp_json_ld', packet2);
	document
		.createTexture()
		.setImage(new Uint8Array(0))
		.setMimeType('image/png')
		.setExtension('KHR_xmp_json_ld', packet2);
	document.createAnimation().setExtension('KHR_xmp_json_ld', packet2);

	document.createBuffer();

	const io = new NodeIO().registerExtensions([KHRXMP]);
	const jsonDocument = await io.writeJSON(document);

	// Serialize.

	t.deepEquals(
		jsonDocument.json.extensions,
		{
			KHR_xmp_json_ld: { packets: [MOCK_JSONLD_PACKET, MOCK_JSONLD_PACKET] },
		},
		'writes packets'
	);
	t.deepEquals(
		jsonDocument.json.asset.extensions,
		{
			KHR_xmp_json_ld: { packet: 0 },
		},
		'writes to asset'
	);
	t.deepEquals(
		jsonDocument.json.nodes[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to node'
	);
	t.deepEquals(
		jsonDocument.json.scenes[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to scene'
	);
	t.deepEquals(
		jsonDocument.json.meshes[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to mesh'
	);
	t.deepEquals(
		jsonDocument.json.materials[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to material'
	);
	t.deepEquals(
		jsonDocument.json.images[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to image'
	);
	t.deepEquals(
		jsonDocument.json.animations[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to animation'
	);

	// Deserialize.

	const rtDocument = await io.readJSON(jsonDocument);
	const rtRoot = rtDocument.getRoot();
	const rtPacket = rtDocument.getRoot().getExtension<Packet>('KHR_xmp_json_ld');
	t.ok(rtPacket, 'reads packet assignment');
	t.deepEquals(rtPacket.toJSONLD(), packet.toJSONLD(), 'reads packet data');
	t.ok(rtRoot.getExtension('KHR_xmp_json_ld'), 'reads packet from asset');
	t.ok(rtRoot.listNodes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from node');
	t.ok(rtRoot.listScenes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from scene');
	t.ok(rtRoot.listMeshes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from mesh');
	t.ok(rtRoot.listMaterials()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from material');
	t.ok(rtRoot.listTextures()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from image');
	t.ok(rtRoot.listAnimations()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from animation');
	t.end();
});

test('@gltf-transform/extensions::xmp | clone', async (t) => {
	const document1 = new Document();
	const xmpExtension = document1.createExtension(KHRXMP);
	const packet1 = xmpExtension.createPacket().fromJSONLD(MOCK_JSONLD_PACKET);
	document1.getRoot().setExtension('KHR_xmp_json_ld', packet1);
	t.equals(document1.getRoot().getExtension('KHR_xmp_json_ld'), packet1, 'sets packet');
	const document2 = document1.clone();
	const packet2 = document2.getRoot().getExtension('KHR_xmp_json_ld') as Packet;
	t.ok(packet2, 'clones packet');
	t.deepEquals(packet1.toJSONLD(), packet2.toJSONLD(), 'equal packet');
});
