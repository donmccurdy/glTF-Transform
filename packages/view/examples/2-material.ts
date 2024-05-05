import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, PMREMGenerator, PerspectiveCamera, Scene, WebGLRenderer, TorusKnotGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Document, Material } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '../dist/view.modern.js';
import { createMaterialPane } from './material-pane';
import { createStatsPane } from './stats-pane.js';
import { Pane } from 'tweakpane';
import { createEnvironment } from './util.js';

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
camera.position.set(-4, 1.2, 5.4);
camera.lookAt(scene.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', render);
controls.minDistance = 2;
controls.maxDistance = 10;
controls.target.set(0, 0, - 0.2);
controls.update();

window.addEventListener('resize', onWindowResize);

//

let material: Material;

const doc = (() => {
	const doc = new Document();
	material = doc.createMaterial('Material');
	const primTemplate = new TorusKnotGeometry(1, 0.4, 100, 16);
	const indicesArray = primTemplate.index!.array as Uint16Array;
	const positionArray = primTemplate.attributes.position.array as Float32Array;
	const normalArray = primTemplate.attributes.normal.array as Float32Array;
	const texcoordArray = primTemplate.attributes.uv.array as Float32Array;
	const prim = doc.createPrimitive()
		.setIndices(doc.createAccessor('indices').setType('SCALAR').setArray(indicesArray))
		.setAttribute('POSITION', doc.createAccessor('p').setType('VEC3').setArray(positionArray))
		.setAttribute('NORMAL', doc.createAccessor('n').setType('VEC3').setArray(normalArray))
		.setAttribute('TEXCOORD_0', doc.createAccessor('t').setType('VEC2').setArray(texcoordArray))
		.setMaterial(material);
	const mesh = doc.createMesh().addPrimitive(prim);
	const node = doc.createNode().setMesh(mesh);
	doc.createScene().addChild(node);
	return doc;
})();

const imageProvider = new NullImageProvider();
const documentView = new DocumentView(doc, {imageProvider});
const modelDef = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
const model = documentView.view(modelDef);
scene.add(model);

//

const pane = new Pane({title: 'DamagedHelmet.glb'});
createMaterialPane(pane, doc, material);
const updateStats = createStatsPane(renderer, pane);

//

animate();

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

function printGraph(node) {
	console.group(' <' + node.type + '> ' + node.name + '#' + node.uuid.substr(0, 6));
	node.children.forEach((child) => printGraph(child));
	if (node.isMesh) {
		console.group(' <' + node.geometry.type + '> ' + node.geometry.name + '#' + node.geometry.uuid.substr(0, 6));
		console.groupEnd();
		console.group(' <' + node.material.type + '> ' + node.material.name + '#' + node.material.uuid.substr(0, 6));
		console.groupEnd();
	}
	console.groupEnd();
}
