const Table = require('cli-table');
const { ImageUtils } = require('@gltf-transform/core');

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatParagraph(str) {
	return str.match(/.{1,80}(\s|$)/g).join('\n');
}

function list (type, doc) {
	const logger = doc.getLogger();

	let result;

	switch (type) {
		case 'meshes': result = listMeshes(doc); break;
		case 'textures': result = listTextures(doc); break;
		case 'extensions': result = listExtensions(doc); break;
		default:
			throw new Error('Not implemented.');
	}

	const {head, rows, warnings} = result;

	if (rows.length === 0) {
		logger.warn(`No ${type} found.`);
		return;
	}

	const table = new Table({head});
	table.push(...rows);
	logger.info(table.toString());
	warnings.forEach((warning) => logger.warn(formatParagraph(warning)));
}

/** List meshes. */
function listMeshes (doc) {
	const rows = doc.getRoot().listMeshes().map((mesh, index) => {
		const references = mesh.listParents()
			.filter((parent) => parent.propertyType !== 'Root')
			.length;
		let size = 0;
		mesh.listPrimitives().forEach((prim) => {
			for (const attr of prim.listAttributes()) {
				size += attr.getArray().byteLength;
			}
			if (prim.getIndices()) size += prim.getIndices().getArray().byteLength;
		});
		return [
			index,
			mesh.getName(),
			references,
			formatBytes(size)
		];
	});

	return {
		rows,
		head: ['index', 'name', 'references', 'size'],
		warnings: [
			'NOTICE: Estimated mesh sizes do not include morph targets, and may overestimate'
			+ ' total sizes if multiple meshes are sharing the same accessors.'
		],
	};
}

/** List textures. */
function listTextures (doc) {
	const rows = doc.getRoot().listTextures().map((texture, index) => {
		const references = texture.listParents()
			.filter((parent) => parent.propertyType !== 'Root')
			.length;

		// TODO: This requires a Buffer, currently?
		// const dims = '';
		// if (texture.getMimeType() === 'image/png') {
		// 	dims = ImageUtils.getSizePNG(texture.getImage()).join('x');
		// } else if (texture.getMimeType() === 'image/jpeg') {
		// 	dims = ImageUtils.getSizeJPEG(texture.getImage()).join('x');
		// }

		return [
			index,
			texture.getName(),
			texture.getURI(),
			references,
			texture.getMimeType(),
			formatBytes(texture.getImage().byteLength)
		]
	});

	return {
		rows,
		head: ['index', 'name', 'uri', 'references', 'mimeType', 'size'],
		warnings: [],
	};
}

/** List extensions. */
function listExtensions (doc) {
	const required = new Set(doc.getRoot().listExtensionsRequired().map((e) => e.extensionName));
	const rows = doc.getRoot().listExtensionsUsed().map((extension) => {
		return [
			extension.extensionName,
			required.has(extension) ? 'x' : ''
		];
	});

	return {
		rows,
		head: ['name', 'required'],
		warnings: [],
	};
}

module.exports = {list};
