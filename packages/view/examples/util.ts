import { WebIO } from '@gltf-transform/core';
import { PMREMGenerator, REVISION, Texture, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const TRANSCODER_PATH = `https://unpkg.com/three@0.${REVISION}.x/examples/jsm/libs/basis/`;

// await MeshoptDecoder.ready;
// await MeshoptEncoder.ready;

let _ktx2Loader: KTX2Loader;
export function createKTX2Loader() {
	if (_ktx2Loader) return _ktx2Loader;
	const renderer = new WebGLRenderer();
	const loader = new KTX2Loader()
		.detectSupport(renderer)
		.setTranscoderPath(TRANSCODER_PATH);
	renderer.dispose();
	return (_ktx2Loader = loader);
}

let _gltfLoader: GLTFLoader;
export function createGLTFLoader() {
	if (_gltfLoader) return _gltfLoader;
	const loader = new GLTFLoader()
		.setMeshoptDecoder(MeshoptDecoder)
		.setKTX2Loader(createKTX2Loader());
	return (_gltfLoader = loader);
}

let _io: WebIO;
export function createIO() {
	if (_io) return _io;
	const io = new WebIO()
		.registerExtensions(ALL_EXTENSIONS)
		.registerDependencies({
			'meshopt.encoder': MeshoptEncoder,
			'meshopt.decoder': MeshoptDecoder,
		});
	return (_io = io);
}

export function createEnvironment(renderer: WebGLRenderer): Promise<Texture> {
	const pmremGenerator = new PMREMGenerator(renderer);
	pmremGenerator.compileEquirectangularShader();

	return new Promise((resolve, reject) => {
		new RGBELoader()
			.load( './royal_esplanade_1k.hdr', ( texture ) => {
				const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
				texture.dispose();
				pmremGenerator.dispose();
				resolve(envMap);
			}, undefined, reject );
	}) as Promise<Texture>;
}
