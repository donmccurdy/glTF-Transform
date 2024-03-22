import type { JSONDocument, ILogger, NodeIO, WebIO } from '@gltf-transform/core';
import {
	InspectAnimationReport,
	InspectMaterialReport,
	InspectMeshReport,
	InspectPropertyReport,
	InspectSceneReport,
	InspectTextureReport,
	inspect as inspectDoc,
} from '@gltf-transform/functions';
import { formatBytes, formatHeader, formatLong, formatParagraph, formatTable, formatXMP, TableFormat } from './util.js';
import type { Packet } from '@gltf-transform/extensions';

type AnyPropertyReport =
	| InspectSceneReport
	| InspectMeshReport
	| InspectMaterialReport
	| InspectTextureReport
	| InspectAnimationReport;

export async function inspect(
	jsonDoc: JSONDocument,
	io: NodeIO | WebIO,
	logger: ILogger,
	format: TableFormat,
): Promise<void> {
	// Summary (does not require parsing).
	const extensionsUsed = jsonDoc.json.extensionsUsed || [];
	const extensionsRequired = jsonDoc.json.extensionsRequired || [];
	console.log(formatHeader('overview'));
	console.log(
		(await formatTable(
			format,
			['key', 'value'],
			[
				['version', jsonDoc.json.asset.version],
				['generator', jsonDoc.json.asset.generator || ''],
				['extensionsUsed', extensionsUsed.join(', ') || 'none'],
				['extensionsRequired', extensionsRequired.join(', ') || 'none'],
			],
		)) + '\n\n',
	);

	// Parse.
	let document;
	try {
		document = await io.readJSON(jsonDoc);
	} catch (e) {
		logger.warn('Unable to parse document.');
		throw e;
	}

	// XMP report.
	const rootPacket = document.getRoot().getExtension('KHR_xmp_json_ld') as Packet | null;
	if (rootPacket && rootPacket.listProperties().length > 0) {
		console.log(formatHeader('metadata'));
		console.log(
			(await formatTable(
				format,
				['key', 'value'],
				rootPacket.listProperties().map((name) => [name, formatXMP(rootPacket.getProperty(name)) as string]),
			)) + '\n\n',
		);
	}

	// Detailed report.
	const report = inspectDoc(document);
	await reportSection('scenes', format, logger, report.scenes);
	await reportSection('meshes', format, logger, report.meshes);
	await reportSection('materials', format, logger, report.materials);
	await reportSection('textures', format, logger, report.textures);
	await reportSection('animations', format, logger, report.animations);
}

async function reportSection(
	type: string,
	format: TableFormat,
	logger: ILogger,
	section: InspectPropertyReport<AnyPropertyReport>,
) {
	const properties = section.properties;

	console.log(formatHeader(type));
	if (!properties.length) {
		console.log(`No ${type} found.\n`);
		return;
	}

	const formattedRecords = properties.map((property: AnyPropertyReport, index: number) => {
		return formatPropertyReport(property, index, format);
	});
	const header = Object.keys(formattedRecords[0]);
	const rows = formattedRecords.map((p: Record<string, string>) => Object.values(p));
	const footnotes = format !== TableFormat.CSV ? getFootnotes(type, rows, header) : [];
	console.log(await formatTable(format, header, rows));
	if (footnotes.length) console.log('\n' + footnotes.join('\n'));
	if (section.warnings) {
		section.warnings.forEach((warning) => logger.warn(formatParagraph(warning)));
	}
	console.log('\n');
}

function formatPropertyReport(property: AnyPropertyReport, index: number, format: TableFormat): Record<string, string> {
	const row: Record<string, string | number> = { '#': index };
	for (const key in property) {
		const value = (property as unknown as Record<string, string | number>)[key];
		if (Array.isArray(value)) {
			row[key] = value.join(', ');
		} else if (key.match(/size/i) && format !== TableFormat.CSV) {
			row[key] = (value as number) > 0 ? formatBytes(value as number) : '';
		} else if (typeof value === 'number') {
			row[key] = format !== TableFormat.CSV ? formatLong(value) : value;
		} else if (typeof value === 'boolean') {
			row[key] = value ? '✓' : '';
		} else {
			row[key] = value;
		}
	}
	return row as Record<string, string>;
}

function getFootnotes(type: string, rows: string[][], header: string[]): string[] {
	const footnotes = [];
	if (type === 'scenes') {
		for (let i = 0; i < header.length; i++) {
			if (header[i] === 'renderVertexCount') header[i] += '¹';
			if (header[i] === 'gpuVertexCount') header[i] += '²';
			if (header[i] === 'gpuNaiveVertexCount') header[i] += '³';
		}
		footnotes.push(
			'¹ Expected number of vertices processed by the vertex shader for one render\n' +
				'  pass, without considering the vertex cache.\n',
		);
		footnotes.push(
			'² Expected number of vertices uploaded to GPU, assuming each Accessor\n' +
				'  is uploaded only once. Actual number uploaded may be higher, \n' +
				'  dependent on the implementation and vertex buffer layout.\n',
		);
		footnotes.push(
			'³ Expected number of vertices uploaded to GPU, assuming each Primitive\n' +
				'  is uploaded once, duplicating vertex attributes shared among Primitives.',
		);
	}
	if (type === 'meshes') {
		for (let i = 0; i < header.length; i++) {
			if (header[i] === 'size') header[i] += '¹';
		}
		footnotes.push(
			'⁴ size estimates GPU memory required by a mesh, in isolation. If accessors are\n' +
				'  shared by other mesh primitives, but the meshes themselves are not reused, then\n' +
				'  the sum of all mesh sizes will overestimate the asset\'s total size. See "dedup".',
		);
	}
	if (type === 'textures') {
		for (let i = 0; i < header.length; i++) {
			if (header[i] === 'gpuSize') header[i] += '⁵';
		}
		footnotes.push(
			'⁵ gpuSize estimates minimum VRAM memory allocation. Older devices may require\n' +
				'  additional memory for GPU compression formats.',
		);
	}
	return footnotes;
}
