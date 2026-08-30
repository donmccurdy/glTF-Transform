import { deepEqual, doesNotThrow, ok, strictEqual, throws } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRXMP, type Packet } from '@gltf-transform/extensions';
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

describe('extensions::KHRXMP', () => {
	test('basic', async () => {
		const document = new Document();
		const xmpExtension = document.createExtension(KHRXMP);
		const packet = xmpExtension.createPacket();

		// Context.
		throws(() => packet.setProperty('test:Foo', true), { message: /context/i }, 'throws on unknown context');
		packet.setContext({ test: MOCK_CONTEXT_URL });
		deepEqual(packet.getContext(), { test: MOCK_CONTEXT_URL }, 'sets context');
		packet.setContext({});
		deepEqual(packet.getContext(), {}, 'removes context');
		packet.setContext({
			test: MOCK_CONTEXT_URL,
			dc: 'http://purl.org/dc/elements/1.1/',
		});
		doesNotThrow(() => packet.setProperty('test:Foo', true), 'accepts known context');

		// Properties.
		strictEqual(packet.getProperty('test:Foo'), true, 'sets literal property');
		packet.setProperty('dc:Creator', { '@list': ['Acme, Inc.'] });
		deepEqual(packet.getProperty('dc:Creator'), { '@list': ['Acme, Inc.'] }, 'sets RDF property');
		deepEqual(packet.listProperties(), ['test:Foo', 'dc:Creator'], 'lists properties');
		packet.setProperty('dc:Creator', null);
		strictEqual(packet.getProperty('dc:Creator'), null, 'removes property');
		packet.setProperty('dc:Creator', { '@list': ['Acme, Inc.'] });

		// Serialize.
		deepEqual(
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
		strictEqual(packet.getProperty('xmpRights:Marked'), true, 'parse JSON LD (1/2)');
		deepEqual(packet.getProperty('dc:title'), MOCK_JSONLD_PACKET['dc:title'], 'parse JSON LD (2/2)');

		// Equals and Copy.
		const packet2 = xmpExtension.createPacket();
		strictEqual(packet.equals(packet2), false, 'not equal');
		packet2.copy(packet);
		ok(packet.equals(packet2), 'not equal');
		packet2.setContext({
			...packet2.getContext(),
			xmp: 'http://ns.adobe.com/xap/1.0/',
		});
		packet2.setProperty('xmp:CreateDate', '2022-01-05');
		strictEqual(packet.equals(packet2), false, 'not equal');

		// Assignment.
		const root = document.getRoot();
		const node = document.createNode();
		const scene = document.createScene();
		const mesh = document.createMesh();
		const material = document.createMaterial();
		const texture = document.createTexture();
		const animation = document.createAnimation();
		const sampler = document.createAnimationSampler(); // invalid
		doesNotThrow(() => root.setExtension('KHR_xmp_json_ld', packet), 'attach to root');
		doesNotThrow(() => node.setExtension('KHR_xmp_json_ld', packet), 'attach to node');
		doesNotThrow(() => scene.setExtension('KHR_xmp_json_ld', packet), 'attach to scene');
		doesNotThrow(() => mesh.setExtension('KHR_xmp_json_ld', packet), 'attach to mesh');
		doesNotThrow(() => material.setExtension('KHR_xmp_json_ld', packet), 'attach to material');
		doesNotThrow(() => texture.setExtension('KHR_xmp_json_ld', packet), 'attach to texture');
		doesNotThrow(() => animation.setExtension('KHR_xmp_json_ld', packet), 'attach to animation');
		throws(() => sampler.setExtension('KHR_xmp_json_ld', packet), undefined, 'attach to sampler (throws)');
		ok(root.getExtension('KHR_xmp_json_ld'), 'read from root');
		ok(node.getExtension('KHR_xmp_json_ld'), 'read from node');
		ok(scene.getExtension('KHR_xmp_json_ld'), 'read from scene');
		ok(mesh.getExtension('KHR_xmp_json_ld'), 'read from mesh');
		ok(material.getExtension('KHR_xmp_json_ld'), 'read from material');
		ok(texture.getExtension('KHR_xmp_json_ld'), 'read from texture');
		ok(animation.getExtension('KHR_xmp_json_ld'), 'read from animation');
		strictEqual(sampler.getExtension('KHR_xmp_json_ld'), null, 'read from sampler (null)');

		// (5) dispose
		packet.dispose();
		strictEqual(root.getExtension('KHR_xmp_json_ld'), null, 'dispose from root');
		strictEqual(node.getExtension('KHR_xmp_json_ld'), null, 'dispose from node');
	});

	test('i/o', async () => {
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

		deepEqual(
			jsonDocument.json.extensions,
			{
				KHR_xmp_json_ld: { packets: [MOCK_JSONLD_PACKET, MOCK_JSONLD_PACKET] },
			},
			'writes packets',
		);
		deepEqual(
			jsonDocument.json.asset.extensions,
			{
				KHR_xmp_json_ld: { packet: 0 },
			},
			'writes to asset',
		);
		deepEqual(
			jsonDocument.json.nodes[0].extensions,
			{
				KHR_xmp_json_ld: { packet: 1 },
			},
			'writes to node',
		);
		deepEqual(
			jsonDocument.json.scenes[0].extensions,
			{
				KHR_xmp_json_ld: { packet: 1 },
			},
			'writes to scene',
		);
		deepEqual(
			jsonDocument.json.meshes[0].extensions,
			{
				KHR_xmp_json_ld: { packet: 1 },
			},
			'writes to mesh',
		);
		deepEqual(
			jsonDocument.json.materials[0].extensions,
			{
				KHR_xmp_json_ld: { packet: 1 },
			},
			'writes to material',
		);
		deepEqual(
			jsonDocument.json.images[0].extensions,
			{
				KHR_xmp_json_ld: { packet: 1 },
			},
			'writes to image',
		);
		deepEqual(
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
		ok(rtPacket, 'reads packet assignment');
		deepEqual(rtPacket.toJSONLD(), packet.toJSONLD(), 'reads packet data');
		ok(rtRoot.getExtension('KHR_xmp_json_ld'), 'reads packet from asset');
		ok(rtRoot.listNodes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from node');
		ok(rtRoot.listScenes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from scene');
		ok(rtRoot.listMeshes()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from mesh');
		ok(rtRoot.listMaterials()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from material');
		ok(rtRoot.listTextures()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from image');
		ok(rtRoot.listAnimations()[0].getExtension('KHR_xmp_json_ld'), 'reads packet from animation');
	});

	test('clone', async () => {
		const document1 = new Document();
		const xmpExtension = document1.createExtension(KHRXMP);
		const packet1 = xmpExtension.createPacket().fromJSONLD(MOCK_JSONLD_PACKET);
		document1.getRoot().setExtension('KHR_xmp_json_ld', packet1);
		strictEqual(document1.getRoot().getExtension('KHR_xmp_json_ld'), packet1, 'sets packet');
		const document2 = cloneDocument(document1);
		const packet2 = document2.getRoot().getExtension('KHR_xmp_json_ld') as Packet;
		ok(packet2, 'clones packet');
		deepEqual(packet1.toJSONLD(), packet2.toJSONLD(), 'equal packet');
	});
});
