import test from 'ava';
import { Document, NodeIO } from '@gltf-transform/core';
import { Packet, KHRXMP } from '@gltf-transform/extensions';
import { cloneDocument } from '@gltf-transform/functions';

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

test('basic', async (t) => {
	const document = new Document();
	const xmpExtension = document.createExtension(KHRXMP);
	const packet = xmpExtension.createPacket();

	// Context.
	t.throws(() => packet.setProperty('test:Foo', true), { message: /context/i }, 'throws on unknown context');
	packet.setContext({ test: MOCK_CONTEXT_URL });
	t.deepEqual(packet.getContext(), { test: MOCK_CONTEXT_URL }, 'sets context');
	packet.setContext({});
	t.deepEqual(packet.getContext(), {}, 'removes context');
	packet.setContext({
		test: MOCK_CONTEXT_URL,
		dc: 'http://purl.org/dc/elements/1.1/',
	});
	t.notThrows(() => packet.setProperty('test:Foo', true), 'accepts known context');

	// Properties.
	t.is(packet.getProperty('test:Foo'), true, 'sets literal property');
	packet.setProperty('dc:Creator', { '@list': ['Acme, Inc.'] });
	t.deepEqual(packet.getProperty('dc:Creator'), { '@list': ['Acme, Inc.'] }, 'sets RDF property');
	t.deepEqual(packet.listProperties(), ['test:Foo', 'dc:Creator'], 'lists properties');
	packet.setProperty('dc:Creator', null);
	t.is(packet.getProperty('dc:Creator'), null, 'removes property');
	packet.setProperty('dc:Creator', { '@list': ['Acme, Inc.'] });

	// Serialize.
	t.deepEqual(
		packet.toJSONLD(),
		{
			'@context': {
				dc: 'http://purl.org/dc/elements/1.1/',
				test: MOCK_CONTEXT_URL,
			},
			'test:Foo': true,
			'dc:Creator': { '@list': ['Acme, Inc.'] },
		},
		'serialize to JSON LD',
	);

	// Deserialize.
	packet.fromJSONLD(MOCK_JSONLD_PACKET);
	t.is(packet.getProperty('xmpRights:Marked'), true, 'parse JSON LD (1/2)');
	t.deepEqual(packet.getProperty('dc:title'), MOCK_JSONLD_PACKET['dc:title'], 'parse JSON LD (2/2)');

	// Equals and Copy.
	const packet2 = xmpExtension.createPacket();
	t.falsy(packet.equals(packet2), 'not equal');
	packet2.copy(packet);
	t.truthy(packet.equals(packet2), 'not equal');
	packet2.setContext({
		...packet2.getContext(),
		xmp: 'http://ns.adobe.com/xap/1.0/',
	});
	packet2.setProperty('xmp:CreateDate', '2022-01-05');
	t.falsy(packet.equals(packet2), 'not equal');

	// Assignment.
	const root = document.getRoot();
	const node = document.createNode();
	const scene = document.createScene();
	const mesh = document.createMesh();
	const material = document.createMaterial();
	const texture = document.createTexture();
	const animation = document.createAnimation();
	const sampler = document.createAnimationSampler(); // invalid
	t.notThrows(() => root.setExtension('KHR_xmp_json_ld', packet), 'attach to root');
	t.notThrows(() => node.setExtension('KHR_xmp_json_ld', packet), 'attach to node');
	t.notThrows(() => scene.setExtension('KHR_xmp_json_ld', packet), 'attach to scene');
	t.notThrows(() => mesh.setExtension('KHR_xmp_json_ld', packet), 'attach to mesh');
	t.notThrows(() => material.setExtension('KHR_xmp_json_ld', packet), 'attach to material');
	t.notThrows(() => texture.setExtension('KHR_xmp_json_ld', packet), 'attach to texture');
	t.notThrows(() => animation.setExtension('KHR_xmp_json_ld', packet), 'attach to animation');
	t.throws(() => sampler.setExtension('KHR_xmp_json_ld', packet), undefined, 'attach to sampler (throws)');
	t.truthy(root.getExtension('KHR_xmp_json_ld'), 'read from root');
	t.truthy(node.getExtension('KHR_xmp_json_ld'), 'read from node');
	t.truthy(scene.getExtension('KHR_xmp_json_ld'), 'read from scene');
	t.truthy(mesh.getExtension('KHR_xmp_json_ld'), 'read from mesh');
	t.truthy(material.getExtension('KHR_xmp_json_ld'), 'read from material');
	t.truthy(texture.getExtension('KHR_xmp_json_ld'), 'read from texture');
	t.truthy(animation.getExtension('KHR_xmp_json_ld'), 'read from animation');
	t.falsy(sampler.getExtension('KHR_xmp_json_ld'), 'read from sampler (null)');

	// (5) dispose
	packet.dispose();
	t.falsy(root.getExtension('KHR_xmp_json_ld'), 'dispose from root');
	t.falsy(node.getExtension('KHR_xmp_json_ld'), 'dispose from node');
});

test('i/o', async (t) => {
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

	t.deepEqual(
		jsonDocument.json.extensions,
		{
			KHR_xmp_json_ld: { packets: [MOCK_JSONLD_PACKET, MOCK_JSONLD_PACKET] },
		},
		'writes packets',
	);
	t.deepEqual(
		jsonDocument.json.asset.extensions,
		{
			KHR_xmp_json_ld: { packet: 0 },
		},
		'writes to asset',
	);
	t.deepEqual(
		jsonDocument.json.nodes[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to node',
	);
	t.deepEqual(
		jsonDocument.json.scenes[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to scene',
	);
	t.deepEqual(
		jsonDocument.json.meshes[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to mesh',
	);
	t.deepEqual(
		jsonDocument.json.materials[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to material',
	);
	t.deepEqual(
		jsonDocument.json.images[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to image',
	);
	t.deepEqual(
		jsonDocument.json.animations[0].extensions,
		{
			KHR_xmp_json_ld: { packet: 1 },
		},
		'writes to animation',
	);

	// Deserialize.

	const rtDocument = await io.readJSON(jsonDocument);
	const rtRoot = rtDocument.getRoot();
	const rtPacket = rtDocument.getRoot().getExtension<Packet>('KHR_xmp_json_ld');
	t.truthy(rtPacket, 'reads packet assignment');
	t.deepEqual(rtPacket.toJSONLD(), packet.toJSONLD(), 'reads packet data');
	t.truthy(rtRoot.getExtension('KHR_xmp_json_ld'), 'reads packet from asset');
	t.truthy(rtRoot.listNodes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from node');
	t.truthy(rtRoot.listScenes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from scene');
	t.truthy(rtRoot.listMeshes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from mesh');
	t.truthy(rtRoot.listMaterials()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from material');
	t.truthy(rtRoot.listTextures()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from image');
	t.truthy(rtRoot.listAnimations()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from animation');
});

test('clone', async (t) => {
	const document1 = new Document();
	const xmpExtension = document1.createExtension(KHRXMP);
	const packet1 = xmpExtension.createPacket().fromJSONLD(MOCK_JSONLD_PACKET);
	document1.getRoot().setExtension('KHR_xmp_json_ld', packet1);
	t.is(document1.getRoot().getExtension('KHR_xmp_json_ld'), packet1, 'sets packet');
	const document2 = cloneDocument(document1);
	const packet2 = document2.getRoot().getExtension('KHR_xmp_json_ld') as Packet;
	t.truthy(packet2, 'clones packet');
	t.deepEqual(packet1.toJSONLD(), packet2.toJSONLD(), 'equal packet');
});
