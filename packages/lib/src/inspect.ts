import { Accessor, Document, ImageUtils, Texture, vec2 } from '@gltf-transform/core';

export function inspect (doc: Document): Report {
	return {
		scenes: listScenes(doc),
		meshes: listMeshes(doc),
		materials: listMaterials(doc),
		textures: listTextures(doc),
		animations: listAnimations(doc),
	};
}

/** List scenes. */
function listScenes (doc): PropertyReport<SceneReport> {
	const scenes = doc.getRoot().listScenes().map((scene) => {
		const root = scene.listNodes()[0];
		return {
			name: scene.getName(),
			rootName: root ? root.getName() : '',
		};
	});
	return {properties: scenes};
}

/** List meshes. */
function listMeshes (doc: Document): PropertyReport<MeshReport> {
	const meshes: MeshReport[] = doc.getRoot().listMeshes().map((mesh) => {
		const instances = mesh.listParents()
			.filter((parent) => parent.propertyType !== 'Root')
			.length;
		let tris = 0;
		let verts = 0;
		let indexed = 0;
		const componentTypes: Set<string> = new Set();
		const semantics: Set<string> = new Set();
		const meshAccessors: Set<Accessor> = new Set();

		mesh.listPrimitives().forEach((prim) => {
			prim.listSemantics().forEach((s) => semantics.add(s));
			for (const attr of prim.listAttributes()) {
				componentTypes.add(attr.getArray().constructor.name);
				meshAccessors.add(attr);
			}
			for (const targ of prim.listTargets()) {
				for (const attr of targ.listAttributes()) {
					componentTypes.add(attr.getArray().constructor.name);
					meshAccessors.add(attr);
				}
			}
			if (prim.getIndices()) {
				const indices = prim.getIndices();
				componentTypes.add(indices.getArray().constructor.name);
				tris += indices.getCount() / 3;
				indexed++;
				meshAccessors.add(indices);
			} else {
				// TODO(bug): Consider mode!
				tris += prim.getAttribute('POSITION').getCount() / 3;
			}
			verts += prim.getAttribute('POSITION').getCount();
		});

		let size = 0;
		Array.from(meshAccessors).forEach((a) => (size += a.getArray().byteLength));

		return {
			name: mesh.getName(),
			primitives: mesh.listPrimitives().length,
			primitivesIndexed: indexed,
			vertices: verts,
			triangles: tris,
			components: Array.from(componentTypes).sort().map((s) => s.replace('Array', '')),
			attributes: Array.from(semantics).sort(),
			instances: instances,
			size: size,
		};
	});

	return {properties: meshes};
}

/** List materials. */
function listMaterials (doc: Document): PropertyReport<MaterialReport> {
	const materials: MaterialReport[] = doc.getRoot().listMaterials().map((material) => {
		const instances = material.listParents()
			.filter((parent) => parent.propertyType !== 'Root')
			.length;

		const slots = doc.getGraph().getLinks()
			.filter((link) => link.getParent() === material && link.getChild() instanceof Texture)
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
function listTextures (doc: Document): PropertyReport<TextureReport> {
	const textures: TextureReport[] = doc.getRoot().listTextures().map((texture) => {
		const instances = texture.listParents()
			.filter((parent) => parent.propertyType !== 'Root')
			.length;

		const slots = doc.getGraph().getLinks()
			.filter((link) => link.getChild() === texture)
			.map((link) => link.getName())
			.filter((name) => name !== 'texture');

		let resolution: vec2;
		if (texture.getMimeType() === 'image/png') {
			resolution = ImageUtils.getSizePNG(texture.getImage());
		} else if (texture.getMimeType() === 'image/jpeg') {
			resolution = ImageUtils.getSizeJPEG(texture.getImage());
		} else {
			resolution = [-1, -1];
		}

		return {
			name: texture.getName(),
			uri: texture.getURI(),
			slots: Array.from(new Set(slots)),
			instances,
			mimeType: texture.getMimeType(),
			resolution: Math.min(...resolution) > 0 ? resolution.join('x') : '',
			size: texture.getImage().byteLength
		};
	});

	return {properties: textures};
}

/** List animations. */
function listAnimations (doc: Document): PropertyReport<AnimationReport> {
	const animations: AnimationReport[] = doc.getRoot().listAnimations().map((anim) => {
		let minTime = Infinity;
		let maxTime = -Infinity;
		anim.listSamplers().forEach((sampler) => {
			minTime = Math.min(minTime, sampler.getInput().getMin([])[0]);
			maxTime = Math.max(maxTime, sampler.getInput().getMax([])[0]);
		});

		let size = 0;
		const accessors: Set<Accessor> = new Set();
		anim.listSamplers().forEach((sampler) => {
			accessors.add(sampler.getInput());
			accessors.add(sampler.getOutput());
		});
		Array.from(accessors).forEach((accessor) => {
			size += accessor.getArray().byteLength;
		});

		return {
			name: anim.getName(),
			channels: anim.listChannels().length,
			samplers: anim.listSamplers().length,
			duration: Math.round((maxTime - minTime) * 1000) / 1000,
			size: size,
		};
	});

	return {properties: animations}
}

interface Report {
	scenes: PropertyReport<SceneReport>;
	meshes: PropertyReport<MeshReport>;
	materials: PropertyReport<MaterialReport>;
	textures: PropertyReport<TextureReport>;
	animations: PropertyReport<AnimationReport>;
}

interface PropertyReport<T> {
	properties: T[];
	errors?: string[];
	warnings?: string[];
}

interface SceneReport {
	name: string;
	rootName: string;
}

interface MeshReport {
	name: string;
	primitives: number;
	primitivesIndexed: number;
	vertices: number;
	triangles: number;
	components: string[];
	attributes: string[];
	instances: number;
	size: number;
}

interface MaterialReport {
	name: string;
	instances: number;
	textures: string[];
	alphaMode: GLTF.MaterialAlphaMode;
	doubleSided: boolean;
}

interface TextureReport {
	name: string;
	uri: string;
	slots: string[];
	instances: number;
	mimeType: string;
	resolution: string;
	size: number;
}

interface AnimationReport {
	name: string;
	channels: number;
	samplers: number;
	duration: number;
	size: number;
}

module.exports = {inspect};
