import { Document, JSONDocument } from '@gltf-transform/core';
import { SimpleDropzone } from 'simple-dropzone';
import { createIO } from './util';

/**
 * Dropzone
 *
 * Utility file to load glTF/GLB models and emit a Document.
 */

const dropEl = document.querySelector('body')!;
const placeholderEl = document.querySelector<HTMLElement>('.dropzone-placeholder')!;
const inputEl = document.querySelector('#file-input')!;

document.addEventListener('DOMContentLoaded', () => {
	const dropzone = new SimpleDropzone(dropEl, inputEl) as any;
	dropzone.on('drop', async ({files}) => {
		try {
			await load(files);
            placeholderEl.style.display = 'none';
		} catch (e) {
			alert(e.message);
		}
	});
});

async function load (fileMap: Map<string, File>) {
	let rootFile: File | null = null;
	let rootPath = '';
	let images: File[] = [];
	Array.from(fileMap).forEach(([path, file]) => {
		if (file.name.match(/\.(gltf|glb)$/)) {
			rootFile = file;
			rootPath = path.replace(file.name, '');
		} else if (file.name.match(/\.(png|jpg|jpeg|ktx2|webp)$/)) {
			images.push(file);
		}
	});

	if (rootFile) return loadDocument(fileMap, rootFile, rootPath);
	throw new Error('No .gltf, .glb, or texture asset found.');
}

async function loadDocument(fileMap: Map<string, File>, rootFile: File, rootPath: string) {
	const io = createIO();
	let jsonDocument: JSONDocument;
	let doc: Document;

	if (rootFile.name.match(/\.(glb)$/)) {
		const arrayBuffer = await rootFile.arrayBuffer();
		jsonDocument = await io.binaryToJSON(new Uint8Array(arrayBuffer));
	} else {
		jsonDocument = {
			json: JSON.parse(await rootFile.text()),
			resources: {},
		};
		for (const [fileName, file] of fileMap.entries()) {
			const path = fileName.replace(rootPath, '');
			const arrayBuffer = await file.arrayBuffer();
			jsonDocument.resources[path] = new Uint8Array(arrayBuffer);
		}
	}

	normalizeURIs(jsonDocument);
	doc = await io.readJSON(jsonDocument);
	removeCompression(doc);
    document.body.dispatchEvent(new CustomEvent('gltf-document', {detail: doc}));
}

/**
 * Normalize URIs to match expected output from simple-dropzone, for folders or
 * ZIP archives. URIs in a glTF file may be escaped, or not. Assume that assetMap is
 * from an un-escaped source, and decode all URIs before lookups.
 * See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
 */
function normalizeURIs (jsonDocument: JSONDocument) {
	const images = jsonDocument.json.images || [];
	const buffers = jsonDocument.json.buffers || [];
	for (const resource of [...images, ...buffers]) {
		if (!resource.uri) continue;
		if (resource.uri.startsWith('data:')) continue;

		resource.uri = decodeURI(resource.uri).replace(/^(\.?\/)/, '');
		if (!(resource.uri in jsonDocument.resources)) {
			throw new Error(`Missing resource: ${resource.uri}`);
		}
	}
}

/** Remove compression extensions now so further writes don't recompress. */
function removeCompression(document: Document) {
	for (const extensionName of ['KHR_draco_mesh_compression', 'EXT_meshopt_compression']) {
		const extension = document.getRoot().listExtensionsUsed()
			.find((extension) => extension.extensionName === extensionName);
		if (extension) extension.dispose();
	}
}
