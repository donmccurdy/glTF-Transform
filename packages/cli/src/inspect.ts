import CLITable from 'cli-table3';
import { stringify } from 'csv-stringify';
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
import { formatBytes, formatHeader, formatLong, formatParagraph, formatXMP } from './util';
import type { Packet } from '@gltf-transform/extensions';

export enum InspectFormat {
	PRETTY = 'pretty',
	CSV = 'csv',
	MD = 'md',
}

type AnyPropertyReport =
	| InspectSceneReport
	| InspectMeshReport
	| InspectMaterialReport
	| InspectTextureReport
	| InspectAnimationReport;

const CLI_TABLE_MARKDOWN_CHARS = {
	top: '',
	'top-mid': '',
	'top-left': '',
	'top-right': '',
	bottom: '',
	'bottom-mid': '',
	'bottom-left': '',
	'bottom-right': '',
	left: '|',
	'left-mid': '',
	mid: '',
	'mid-mid': '',
	right: '|',
	'right-mid': '',
	middle: '|',
};

export async function inspect(
	jsonDoc: JSONDocument,
	io: NodeIO | WebIO,
	logger: ILogger,
	format: InspectFormat
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
			]
		)) + '\n\n'
	);

	// Parse.
	let doc;
	try {
		doc = await io.readJSON(jsonDoc);
	} catch (e) {
		logger.warn('Unable to parse document.');
		throw e;
	}

	// XMP report.
	const rootPacket = doc.getRoot().getExtension('KHR_xmp_json_ld') as Packet | null;
	if (rootPacket && rootPacket.listProperties().length > 0) {
		console.log(formatHeader('metadata'));
		console.log(
			(await formatTable(
				format,
				['key', 'value'],
				rootPacket.listProperties().map((name) => [name, formatXMP(rootPacket.getProperty(name)) as string])
			)) + '\n\n'
		);
	}

	// Detailed report.
	const report = inspectDoc(doc);
	await reportSection('scenes', format, logger, report.scenes);
	await reportSection('meshes', format, logger, report.meshes);
	await reportSection('materials', format, logger, report.materials);
	await reportSection('textures', format, logger, report.textures);
	await reportSection('animations', format, logger, report.animations);
}

async function reportSection(
	type: string,
	format: InspectFormat,
	logger: ILogger,
	section: InspectPropertyReport<AnyPropertyReport>
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
	const footnotes = format !== InspectFormat.CSV ? getFootnotes(type, rows, header) : [];
	console.log(await formatTable(format, header, rows));
	if (footnotes.length) console.log('\n' + footnotes.join('\n'));
	if (section.warnings) {
		section.warnings.forEach((warning) => logger.warn(formatParagraph(warning)));
	}
	console.log('\n');
}

async function formatTable(format: InspectFormat, head: string[], rows: string[][]): Promise<string> {
	switch (format) {
		case InspectFormat.PRETTY: {
			const table = new CLITable({ head });
			table.push(...rows);
			return table.toString();
		}
		case InspectFormat.CSV:
			return new Promise((resolve, reject) => {
				stringify([head, ...rows], (err, output) => {
					err ? reject(err) : resolve(output);
				});
			});
		case InspectFormat.MD: {
			const table = new CLITable({ head, chars: CLI_TABLE_MARKDOWN_CHARS });
			table.push(new Array(rows[0].length).fill('---'));
			table.push(...rows);
			return table.toString();
		}
	}
}

function formatPropertyReport(
	property: AnyPropertyReport,
	index: number,
	format: InspectFormat
): Record<string, string> {
	const row: Record<string, string | number> = { '#': index };
	for (const key in property) {
		const value = (property as unknown as Record<string, string | number>)[key];
		if (Array.isArray(value)) {
			row[key] = value.join(', ');
		} else if (key.match(/size/i) && format !== InspectFormat.CSV) {
			row[key] = value > 0 ? formatBytes(value as number) : '';
		} else if (typeof value === 'number') {
			row[key] = format !== InspectFormat.CSV ? formatLong(value) : value;
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
	if (type === 'meshes') {
		for (let i = 0; i < header.length; i++) {
			if (header[i] === 'size') header[i] += '¹';
		}
		footnotes.push(
			'¹ size estimates GPU memory required by a mesh, in isolation. If accessors are\n' +
				'  shared by other mesh primitives, but the meshes themselves are not reused, then\n' +
				'  the sum of all mesh sizes will overestimate the asset\'s total size. See "dedup".'
		);
	}
	if (type === 'textures') {
		for (let i = 0; i < header.length; i++) {
			if (header[i] === 'gpuSize') header[i] += '¹';
		}
		footnotes.push(
			'¹ gpuSize estimates minimum GPU memory allocation. Older devices may require\n' +
				'  additional memory for GPU compression formats.'
		);
	}
	return footnotes;
}
