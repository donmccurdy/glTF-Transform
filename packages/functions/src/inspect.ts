import {
	Accessor,
	Document,
	ExtensionProperty,
	GLTF,
	ImageUtils,
	Texture,
	getBounds,
	PropertyType,
} from '@gltf-transform/core';
import { getGLPrimitiveCount } from './utils.js';
import { KHR_DF_MODEL_ETC1S, KHR_DF_MODEL_UASTC, read as readKTX } from 'ktx-parse';

/** Inspects the contents of a glTF file and returns a JSON report. */
export function inspect(doc: Document): InspectReport {
	return {
		scenes: listScenes(doc),
		meshes: listMeshes(doc),
		materials: listMaterials(doc),
		textures: listTextures(doc),
		animations: listAnimations(doc),
	};
}

/** List scenes. */
function listScenes(doc: Document): InspectPropertyReport<InspectSceneReport> {
	const scenes = doc
		.getRoot()
		.listScenes()
		.map((scene) => {
			const root = scene.listChildren()[0];
			const sceneBounds = getBounds(scene);
			return {
				name: scene.getName(),
				rootName: root ? root.getName() : '',
				bboxMin: toPrecision(sceneBounds.min),
				bboxMax: toPrecision(sceneBounds.max),
			};
		});
	return { properties: scenes };
}

/** List meshes. */
function listMeshes(doc: Document): InspectPropertyReport<InspectMeshReport> {
	const meshes: InspectMeshReport[] = doc
		.getRoot()
		.listMeshes()
		.map((mesh) => {
			const instances = mesh.listParents().filter((parent) => parent.propertyType !== PropertyType.ROOT).length;
			let glPrimitives = 0;
			let verts = 0;
			const semantics = new Set<string>();
			const meshIndices = new Set<string>();
			const meshAccessors: Set<Accessor> = new Set();

			mesh.listPrimitives().forEach((prim) => {
				for (const semantic of prim.listSemantics()) {
					const attr = prim.getAttribute(semantic)!;
					semantics.add(semantic + ':' + accessorToTypeLabel(attr));
					meshAccessors.add(attr);
				}
				for (const targ of prim.listTargets()) {
					targ.listAttributes().forEach((attr) => meshAccessors.add(attr));
				}
				const indices = prim.getIndices();
				if (indices) {
					meshIndices.add(accessorToTypeLabel(indices));
					meshAccessors.add(indices);
				}
				verts += prim.listAttributes()[0].getCount();
				glPrimitives += getGLPrimitiveCount(prim);
			});

			let size = 0;
			Array.from(meshAccessors).forEach((a) => (size += a.getArray()!.byteLength));

			const modes = mesh.listPrimitives().map((prim) => MeshPrimitiveModeLabels[prim.getMode()]);

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

	return { properties: meshes };
}

/** List materials. */
function listMaterials(doc: Document): InspectPropertyReport<InspectMaterialReport> {
	const materials: InspectMaterialReport[] = doc
		.getRoot()
		.listMaterials()
		.map((material) => {
			const instances = material
				.listParents()
				.filter((parent) => parent.propertyType !== PropertyType.ROOT).length;

			// Find all texture slots attached to this material or its extensions.
			const extensions = new Set<ExtensionProperty>(material.listExtensions());
			const slots = doc
				.getGraph()
				.listEdges()
				.filter((ref) => {
					const child = ref.getChild();
					const parent = ref.getParent();
					if (child instanceof Texture && parent === material) {
						return true;
					}
					if (child instanceof Texture && parent instanceof ExtensionProperty && extensions.has(parent)) {
						return true;
					}
					return false;
				})
				.map((ref) => ref.getName());

			return {
				name: material.getName(),
				instances,
				textures: slots,
				alphaMode: material.getAlphaMode(),
				doubleSided: material.getDoubleSided(),
			};
		});

	return { properties: materials };
}

/** List textures. */
function listTextures(doc: Document): InspectPropertyReport<InspectTextureReport> {
	const textures: InspectTextureReport[] = doc
		.getRoot()
		.listTextures()
		.map((texture) => {
			const instances = texture
				.listParents()
				.filter((parent) => parent.propertyType !== PropertyType.ROOT).length;

			const slots = doc
				.getGraph()
				.listParentEdges(texture)
				.filter((edge) => edge.getParent().propertyType !== PropertyType.ROOT)
				.map((edge) => edge.getName());

			const resolution = ImageUtils.getSize(texture.getImage()!, texture.getMimeType());

			let compression = '';
			if (texture.getMimeType() === 'image/ktx2') {
				const container = readKTX(texture.getImage()!);
				const dfd = container.dataFormatDescriptor[0];
				if (dfd.colorModel === KHR_DF_MODEL_ETC1S) {
					compression = 'ETC1S';
				} else if (dfd.colorModel === KHR_DF_MODEL_UASTC) {
					compression = 'UASTC';
				}
			}

			return {
				name: texture.getName(),
				uri: texture.getURI(),
				slots: Array.from(new Set(slots)),
				instances,
				mimeType: texture.getMimeType(),
				compression,
				resolution: resolution ? resolution.join('x') : '',
				size: texture.getImage()!.byteLength,
				gpuSize: ImageUtils.getVRAMByteLength(texture.getImage()!, texture.getMimeType()),
			};
		});

	return { properties: textures };
}

/** List animations. */
function listAnimations(doc: Document): InspectPropertyReport<InspectAnimationReport> {
	const animations: InspectAnimationReport[] = doc
		.getRoot()
		.listAnimations()
		.map((anim) => {
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

	return { properties: animations };
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
	compression: string;
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

const NumericTypeLabels: Record<string, string> = {
	Float32Array: 'f32',
	Uint32Array: 'u32',
	Uint16Array: 'u16',
	Uint8Array: 'u8',
	Int32Array: 'i32',
	Int16Array: 'i16',
	Int8Array: 'i8',
};

/** Maps values in a vector to a finite precision. */
function toPrecision(v: number[]): number[] {
	for (let i = 0; i < v.length; i++) {
		if ((v[i] as number).toFixed) v[i] = Number(v[i].toFixed(5));
	}
	return v;
}

function accessorToTypeLabel(accessor: Accessor): string {
	const array = accessor.getArray()!;
	const base = NumericTypeLabels[array.constructor.name] || '?';
	const suffix = accessor.getNormalized() ? '_norm' : '';
	return base + suffix;
}
