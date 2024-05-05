import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, PMREMGenerator, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTF, Material } from '@gltf-transform/core';
import { DocumentView } from '../dist/view.modern.js';
import {Pane} from 'tweakpane';
import * as TweakpanePluginThumbnailList from 'tweakpane-plugin-thumbnail-list';
import { createStatsPane } from './stats-pane.js';
import { createMaterialPane } from './material-pane.js';
import { createEnvironment, createIO } from './util.js';

const renderer = new WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.useLegacyLights = false;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const containerEl = document.querySelector('#container')!;
containerEl.appendChild(renderer.domElement);

const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const scene = new Scene();

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
controls.minDistance = 2;
controls.maxDistance = 10;
controls.target.set(0, 0, - 0.2);
controls.update();

window.addEventListener( 'resize', onWindowResize );

//

let material: Material;
let documentView: DocumentView;

const pane = new Pane({title: 'DamagedHelmet.glb'});
pane.registerPlugin(TweakpanePluginThumbnailList);
const updateStats = createStatsPane(renderer, pane);


const io = createIO();
io.read('./DamagedHelmet.glb').then(async (doc) => {
	console.time('DocumentView::init');
	documentView = new DocumentView(doc);
	console.timeEnd('DocumentView::init');

	window['doc'] = doc;
	const modelDef = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
	const model = window['model'] = documentView.view(modelDef);

	scene.add(model);
	animate();

	// GUI.

	material = doc.getRoot().listMaterials().pop()!;
	createMaterialPane(pane, doc, material);

	const prim = doc.getRoot().listMeshes().pop()!.listPrimitives().pop()!;
	const primFolder = pane.addFolder({title: 'Primitive'});
	primFolder.addInput({mode: 4}, 'mode', {
		options: {
			POINTS: 0,
			LINES: 1,
			TRIANGLES: 4,
		}
	}).on('change', (ev) => {
		prim.setMode(ev.value as GLTF.MeshPrimitiveMode);
	});

	pane.addButton({title: 'stats'}).on('click', () => {
		documentView.gc();
		console.table(documentView.stats());
	});
});

//

function animate() {
	requestAnimationFrame(animate);
	render();
	updateStats();
}

function render() {
	renderer.render(scene, camera);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	render();
}
