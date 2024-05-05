import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, PerspectiveCamera, Scene, WebGLRenderer, Object3D, Mesh, Material, Box3, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Document, Material as MaterialDef } from '@gltf-transform/core';
import { metalRough } from '@gltf-transform/functions';
import { DocumentView } from '../dist/view.modern.js';
import { createEnvironment, createGLTFLoader, createIO } from './util.js';

const renderer = new WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.useLegacyLights = false;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const containerEl = document.querySelector('#container')!;
containerEl.appendChild(renderer.domElement);

const scene = new Scene();
let documentView: DocumentView;
let modelBefore: Object3D;
let modelAfter: Object3D;

const light1 = new AmbientLight();
const light2 = new DirectionalLight();
light2.position.set(1, 2, 3);
scene.add(light1, light2);

createEnvironment(renderer)
	.then((environment) => {
		scene.environment = environment;
		scene.background = environment;
		render();
	});

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
camera.position.set(-1.8, 0.6, 2.7);
camera.lookAt(scene.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', render);
controls.update();

const io = createIO();
const loader = createGLTFLoader();

window.addEventListener('resize', onWindowResize);

//

document.body.addEventListener('gltf-document', async (event) => {
	const doc = (event as CustomEvent).detail as Document;
	const modelDef = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];

	if (modelBefore) disposeBefore(modelBefore);
	if (modelAfter) disposeAfter(modelAfter);

	await checkMaterials(doc);
	await checkExtensions(doc);

	console.time('DocumentView::init');
	documentView = new DocumentView(doc);
	modelAfter = documentView.view(modelDef);
	console.timeEnd('DocumentView::init');

	console.time('WebIO::writeBinary');
	const glb = await io.writeBinary(doc);
	console.timeEnd('WebIO::writeBinary');

	console.time('GLTFLoader::parse');
	modelBefore = await new Promise((resolve, reject) => {
		loader.parse(glb.buffer, '', ({scene}) => resolve(scene), reject);
	}) as Object3D;
	console.timeEnd('GLTFLoader::parse');

	frameContent(modelBefore, -1);
	frameContent(modelAfter, 1);

	controls.update();
	render();

	console.table(documentView.stats());
});

//

function render() {
	renderer.render(scene, camera);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	render();
}

function disposeBefore(model: Object3D) {
	scene.remove(model);
	model.traverse((o) => {
		if ((o as Mesh).isMesh) {
			(o as Mesh).geometry.dispose();
			const material = (o as Mesh).material as Material;
			for (const key in material) {
				if (material[key] && material[key].isTexture) {
					material[key].dispose();
				}
			}
			material.dispose();
		}
	});
}

function disposeAfter(model: Object3D) {
	scene.remove(model);
	documentView.dispose();
	console.table(documentView.stats());
}

function frameContent(object: Object3D, offset: 1 | -1) {
	const box = new Box3().setFromObject(object);
	const size = box.getSize(new Vector3());
	const length = box.getSize(new Vector3()).length();
	const center = box.getCenter(new Vector3());

	controls.reset();

	object.position.x += (object.position.x - center.x) + offset * size.x / 2;
	object.position.y += (object.position.y - center.y);
	object.position.z += (object.position.z - center.z);
	controls.maxDistance = length * 10;
	camera.near = length / 100;
	camera.far = length * 100;
	camera.updateProjectionMatrix();

	camera.position.copy(center);
	camera.position.x += length / 2.0;
	camera.position.y += length / 5.0;
	camera.position.z += length / 2.0;
	camera.lookAt(center);

	controls.saveState();

	scene.add(object);
}

/**
 * Adds a default PBR material to any mesh primitives without one. This is considerably simpler
 * than trying to handle all cases with default materials internally, because the logic for
 * creating material variants (vertexColors, points, ...) is part of the _MaterialSubject_ class,
 * and no MaterialDef exists for input.
 *
 * Context:
 * - https://github.com/donmccurdy/glTF-Report-Feedback/issues/43
 */
async function checkMaterials(document: Document) {
	let defaultMaterial: MaterialDef | undefined;
	for (const mesh of document.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			if (!prim.getMaterial()) {
				defaultMaterial ||= document.createMaterial();
				prim.setMaterial(defaultMaterial);
			}
		}
	}
}

async function checkExtensions(document: Document) {
	const extensions = document.getRoot()
		.listExtensionsUsed()
		.map((ext) => ext.extensionName);
	console.debug(`EXTENSIONS: ${extensions.join() || 'None'}`);

	if (extensions.includes('KHR_materials_pbrSpecularGlossiness')) {
		await document.transform(metalRough());
	}
}
