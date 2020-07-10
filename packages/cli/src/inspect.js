const Table = require('cli-table');
const { ImageUtils } = require('@gltf-transform/core');
const { formatBytes, formatHeader, formatParagraph } = require('./util');

function inspect (doc) {
	const logger = doc.getLogger();

	const table = new Table();
	table.push(
		{generator: doc.getRoot().getAsset().generator},
		{version: doc.getRoot().getAsset().version},
		{extensionsUsed: doc.getRoot().listExtensionsUsed().join(', ') || 'none'},
		{extensionsRequired: doc.getRoot().listExtensionsRequired().join(', ') || 'none'},
	);
	console.log(formatHeader('info'));
	console.log(table.toString() + '\n');

	for (const type of ['meshes', 'textures', 'animations']) {
		let result;
		switch (type) {
			case 'meshes': result = listMeshes(doc); break;
			case 'textures': result = listTextures(doc); break;
			case 'animations': result = listAnimations(doc); break;
		}
		const {head, rows, warnings} = result;

		console.log(formatHeader(type));
		if (rows.length === 0) {
			console.log(`No ${type} found.\n`);
			return;
		}

		const table = new Table({head});
		table.push(...rows);

		console.log(table.toString());
		warnings.forEach((warning) => logger.warn(formatParagraph(warning)));
		console.log('\n');
	}
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
			'Estimated mesh sizes do not include morph targets, and may overestimate'
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

		const slots = doc.getGraph().getLinks()
			.filter((link) => link.getChild() === texture)
			.map((link) => link.getName())
			.filter((name) => name !== 'texture');

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
			Array.from(new Set(slots)).join(', '),
			references,
			texture.getMimeType(),
			formatBytes(texture.getImage().byteLength)
		]
	});

	return {
		rows,
		head: ['index', 'name', 'uri', 'slots', 'references', 'mimeType', 'size'],
		warnings: [],
	};
}

/** List animations. */
function listAnimations (doc) {
	const rows = doc.getRoot().listAnimations().map((anim, index) => {
		let minTime = Infinity;
		let maxTime = -Infinity;
		anim.listSamplers().forEach((sampler) => {
			minTime = Math.min(minTime, sampler.getInput().getMin([])[0]);
			maxTime = Math.max(maxTime, sampler.getInput().getMax([])[0]);
		});

		let size = 0;
		const accessors = new Set();
		anim.listSamplers().forEach((sampler) => {
			accessors.add(sampler.getInput());
			accessors.add(sampler.getOutput());
		});
		Array.from(accessors)
			.map((accessor) => accessor.getArray().byteLength)
			.forEach((byteLength) => (size += byteLength));

		return [
			index,
			anim.getName(),
			anim.listChannels().length,
			anim.listSamplers().length,
			(maxTime - minTime).toFixed(3) + 's',
			formatBytes(size),
		]
	});

	return {
		rows,
		head: ['index', 'name', 'channels', 'samplers', 'duration', 'size'],
		warnings: [
			'Estimated animation sizes may overestimate total sizes if multiple animations'
			+ ' are sharing the same accessors.'
		],
	}
}

module.exports = {inspect};
