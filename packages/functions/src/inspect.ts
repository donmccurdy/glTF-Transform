import { Accessor, Document, ExtensionProperty, GLTF, ImageUtils, Texture, TypedArray, bounds } from '@gltf-transform/core';
import { getGLPrimitiveCount } from './utils';

/** Inspects the contents of a glTF file and returns a JSON report. */
export function inspect (doc: Document): InspectReport {
	return {
		scenes: listScenes(doc),
		meshes: listMeshes(doc),
		materials: listMaterials(doc),
		textures: listTextures(doc),
		animations: listAnimations(doc),
	};
}

/** List scenes. */
function listScenes (doc: Document): InspectPropertyReport<InspectSceneReport> {
	const scenes = doc.getRoot().listScenes().map((scene) => {
		const root = scene.listChildren()[0];
		const sceneBounds = bounds(scene);
		return {
			name: scene.getName(),
			rootName: root ? root.getName() : '',
			bboxMin: toPrecision(sceneBounds.min),
			bboxMax: toPrecision(sceneBounds.max),
		};
	});
	return {properties: scenes};
}

/** List meshes. */
function listMeshes (doc: Document): InspectPropertyReport<InspectMeshReport> {
	const meshes: InspectMeshReport[] = doc.getRoot().listMeshes().map((mesh) => {
		const instances = mesh.listParents()
			.filter((parent) => parent.propertyType !== 'Root')
			.length;
		let glPrimitives = 0;
		let verts = 0;
		const semantics = new Set<string>();
		const meshIndices = new Set<string>();
		const meshAccessors: Set<Accessor> = new Set();

		mesh.listPrimitives().forEach((prim) => {
			for (const semantic of prim.listSemantics()) {
				const attr = prim.getAttribute(semantic)!;
				semantics.add(semantic + ':' + arrayToType(attr.getArray()!));
				meshAccessors.add(attr);
			}
			for (const targ of prim.listTargets()) {
				targ.listAttributes().forEach((attr) => meshAccessors.add(attr));
			}
			const indices = prim.getIndices();
			if (indices) {
				meshIndices.add(arrayToType(indices.getArray()!));
				meshAccessors.add(indices);
			}
			verts += prim.listAttributes()[0].getCount();
			glPrimitives += getGLPrimitiveCount(prim);
		});

		let size = 0;
		Array.from(meshAccessors).forEach((a) => (size += a.getArray()!.byteLength));

		const modes = mesh.listPrimitives()
			.map((prim) => MeshPrimitiveModeLabels[prim.getMode()]);

		return {
			name: mesh.getName(),
			mode: Array.from(new Set(modes)),
			primitives: mesh.listPrimitives().length,
			glPrimitives: glPrimitives,
			vertices: verts,
			indices: Array.from(meshIndices).sort(),
			attributes: Array.from(semantics).sort(),
			instances: instances,
			size: size,
		};
	});

	return {properties: meshes};
}

/** List materials. */
function listMaterials (doc: Document): InspectPropertyReport<InspectMaterialReport> {
	const materials: InspectMaterialReport[] = doc.getRoot().listMaterials().map((material) => {
		const instances = material.listParents()
			.filter((parent) => parent.propertyType !== 'Root')
			.length;

		// Find all texture slots attached to this material or its extensions.
		const extensions = new Set<ExtensionProperty>(material.listExtensions());
		const slots = doc.getGraph().getLinks()
			.filter((link) => {
				const child = link.getChild();
				const parent = link.getParent();
				if (child instanceof Texture && parent === material) {
					return true;
				}
				if (child instanceof Texture
						&& parent instanceof ExtensionProperty
						&& extensions.has(parent)) {
					return true;
				}
				return false;
			})
			.map((link) => link.getName());

		return {
			name: material.getName(),
			instances,
			textures: slots,
			alphaMode: material.getAlphaMode(),
			doubleSided: material.getDoubleSided(),
		};
	});

	return {properties: materials};
}

/** List textures. */
function listTextures (doc: Document): InspectPropertyReport<InspectTextureReport> {
	const textures: InspectTextureReport[] = doc.getRoot().listTextures().map((texture) => {
		const instances = texture.listParents()
			.filter((parent) => parent.propertyType !== 'Root')
			.length;

		const slots = doc.getGraph().listParentLinks(texture)
			.map((link) => link.getName())
			.filter((name) => name !== 'texture');

		const resolution = ImageUtils.getSize(texture.getImage()!, texture.getMimeType());

		return {
			name: texture.getName(),
			uri: texture.getURI(),
			slots: Array.from(new Set(slots)),
			instances,
			mimeType: texture.getMimeType(),
			resolution: resolution ? resolution.join('x') : '',
			size: texture.getImage()!.byteLength,
			gpuSize: ImageUtils.getMemSize(texture.getImage()!, texture.getMimeType()),
		};
	});

	return {properties: textures};
}

/** List animations. */
function listAnimations (doc: Document): InspectPropertyReport<InspectAnimationReport> {
	const animations: InspectAnimationReport[] = doc.getRoot().listAnimations().map((anim) => {
		let minTime = Infinity;
		let maxTime = -Infinity;
		anim.listSamplers().forEach((sampler) => {
			const input = sampler.getInput();
			if (!input) return;
			minTime = Math.min(minTime, input.getMin([])[0]);
			maxTime = Math.max(maxTime, input.getMax([])[0]);
		});

		let size = 0;
		let keyframes = 0;
		const accessors: Set<Accessor> = new Set();
		anim.listSamplers().forEach((sampler) => {
			const input = sampler.getInput();
			const output = sampler.getOutput();
			if (!input) return;
			keyframes += input.getCount();
			accessors.add(input);
			if (!output) return;
			accessors.add(output);
		});
		Array.from(accessors).forEach((accessor) => {
			size += accessor.getArray()!.byteLength;
		});

		return {
			name: anim.getName(),
			channels: anim.listChannels().length,
			samplers: anim.listSamplers().length,
			duration: Math.round((maxTime - minTime) * 1000) / 1000,
			keyframes: keyframes,
			size: size,
		};
	});

	return {properties: animations};
}

export interface InspectReport {
	scenes: InspectPropertyReport<InspectSceneReport>;
	meshes: InspectPropertyReport<InspectMeshReport>;
	materials: InspectPropertyReport<InspectMaterialReport>;
	textures: InspectPropertyReport<InspectTextureReport>;
	animations: InspectPropertyReport<InspectAnimationReport>;
}

export interface InspectPropertyReport<T> {
	properties: T[];
	errors?: string[];
	warnings?: string[];
}

export interface InspectSceneReport {
	name: string;
	rootName: string;
	bboxMin: number[];
	bboxMax: number[];
}

export interface InspectMeshReport {
	name: string;
	primitives: number;
	mode: string[];
	vertices: number;
	glPrimitives: number;
	indices: string[];
	attributes: string[];
	instances: number;
	size: number;
}

export interface InspectMaterialReport {
	name: string;
	instances: number;
	textures: string[];
	alphaMode: GLTF.MaterialAlphaMode;
	doubleSided: boolean;
}

export interface InspectTextureReport {
	name: string;
	uri: string;
	slots: string[];
	instances: number;
	mimeType: string;
	resolution: string;
	size: number;
	gpuSize: number | null;
}

export interface InspectAnimationReport {
	name: string;
	channels: number;
	samplers: number;
	keyframes: number;
	duration: number;
	size: number;
}

const MeshPrimitiveModeLabels = [
	'POINTS',
	'LINES',
	'LINE_LOOP',
	'LINE_STRIP',
	'TRIANGLES',
	'TRIANGLE_STRIP',
	'TRIANGLE_FAN',
];

/** Maps values in a vector to a finite precision. */
function toPrecision(v: number[]): number[] {
	for (let i = 0; i < v.length; i++) {
		if ((v[i] as number).toFixed) v[i] = Number(v[i].toFixed(5));
	}
	return v;
}

function arrayToType(array: TypedArray): string {
	return array.constructor.name.replace('Array', '').toLowerCase();
}
