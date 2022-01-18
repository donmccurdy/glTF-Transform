require('source-map-support').install();

import test from 'tape';
import { Document, NodeIO } from '@gltf-transform/core';
import { Packet, XMP } from '../';

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
	const xmpExtension = document.createExtension(XMP);
	const packet = xmpExtension.createPacket();

	// Context.
	t.throws(() => packet.setProperty('test:foo', true), /context/i, 'throws on unknown context');
	packet.setContext('test', MOCK_CONTEXT_URL);
	t.equals(packet.getContext('test'), MOCK_CONTEXT_URL, 'sets context');
	t.doesNotThrow(() => packet.setProperty('test:foo', true), 'accepts known context');

	// Properties.
	t.equals(packet.getProperty('test:foo'), true, 'sets literal property');
	packet.setProperty('dc:creator', { '@list': ['Acme, Inc.'] });
	t.deepEquals(packet.getProperty('dc:creator'), { '@list': ['Acme, Inc.'] }, 'sets RDF property');
	t.deepEquals(packet.listProperties(), ['test:foo', 'dc:creator'], 'lists properties');

	// Serialize.
	t.deepEquals(
		packet.toJSONLD(),
		{
			'@context': {
				dc: 'http://purl.org/dc/elements/1.1/',
				test: MOCK_CONTEXT_URL,
			},
			'test:foo': true,
			'dc:creator': { '@list': ['Acme, Inc.'] },
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
	packet2.setProperty('xmp:CreateDate', '2022-01-05');
	t.notOk(packet.equals(packet2), 'not equal');

	// Assignment.
	const root = document.getRoot();
	const node = document.createNode();
	const sampler = document.createAnimationSampler();
	t.doesNotThrow(() => root.setExtension('KHR_xmp_json_ld', packet), 'attach to root');
	t.doesNotThrow(() => node.setExtension('KHR_xmp_json_ld', packet), 'attach to node');
	t.throws(() => sampler.setExtension('KHR_xmp_json_ld', packet), 'attach to sampler (throws)');
	t.ok(root.getExtension('KHR_xmp_json_ld'), 'read from root');
	t.ok(node.getExtension('KHR_xmp_json_ld'), 'read from node');
	t.notOk(sampler.getExtension('KHR_xmp_json_ld'), 'read from sampler (null)');

	// (5) dispose
	packet.dispose();
	t.notOk(root.getExtension('KHR_xmp_json_ld'), 'dispose from root');
	t.notOk(node.getExtension('KHR_xmp_json_ld'), 'dispose from node');

	t.end();
});

test('@gltf-transform/extensions::xmp | i/o', async (t) => {
	const document = new Document();
	const xmpExtension = document.createExtension(XMP);
	const packet = xmpExtension.createPacket().fromJSONLD(MOCK_JSONLD_PACKET);

	const root = document.getRoot();
	root.setExtension('KHR_xmp_json_ld', packet);

	const io = new NodeIO().registerExtensions([XMP]);
	const jsonDocument = await io.writeJSON(document);

	// Serialize.

	t.deepEquals(
		jsonDocument.json.extensions,
		{
			KHR_xmp_json_ld: { packets: [MOCK_JSONLD_PACKET] },
		},
		'writes packets'
	);
	t.deepEquals(
		jsonDocument.json.asset.extensions,
		{
			KHR_xmp_json_ld: { packet: 0 },
		},
		'writes asset'
	);

	// Deserialize.

	const rtDocument = await io.readJSON(jsonDocument);
	const rtPacket = rtDocument.getRoot().getExtension<Packet>('KHR_xmp_json_ld');
	t.ok(rtPacket, 'reads packet assignment');
	t.deepEquals(rtPacket.toJSONLD(), packet.toJSONLD(), 'reads packet data');
	t.end();
});
