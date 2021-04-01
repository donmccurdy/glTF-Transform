import CLITable from 'cli-table3';
import stringify from 'csv-stringify';
import mdTable from 'markdown-table';
import { JSONDocument, Logger, NodeIO, WebIO } from '@gltf-transform/core';
import { inspect as inspectDoc } from '@gltf-transform/lib';
import { formatBytes, formatHeader, formatLong, formatParagraph } from './util';

export enum InspectFormat {
	PRETTY = 'pretty',
	CSV = 'csv',
	MD = 'md'
}

export async function inspect (
		jsonDoc: JSONDocument,
		io: NodeIO | WebIO,
		logger: Logger,
		format: InspectFormat): Promise<void> {

	// Summary (does not require parsing).
	const extensionsUsed = jsonDoc.json.extensionsUsed || [];
	const extensionsRequired = jsonDoc.json.extensionsRequired || [];
	console.log(formatHeader('metadata'));
	console.log(await formatTable(
		format,
		['key', 'value'],
		[
			['version', jsonDoc.json.asset.version],
			['generator', jsonDoc.json.asset.generator || ''],
			['extensionsUsed', extensionsUsed.join(', ') || 'none'],
			['extensionsRequired', extensionsRequired.join(', ') || 'none'],
		]
	) + '\n\n');

	// Parse.
	let doc;
	try {
		doc = io.readJSON(jsonDoc);
	} catch (e) {
		logger.warn('Unable to parse document.');
		throw e;
	}

	// Detailed report.
	const report = inspectDoc(doc);
	for (const type in report) {
		const properties = report[type].properties;

		console.log(formatHeader(type));
		if (!properties.length) {
			console.log(`No ${type} found.\n`);
			continue;
		}

		const formattedRecords = properties
			.map((property, index) => formatPropertyReport(property, index, format));
		const header = Object.keys(formattedRecords[0]);
		const rows = formattedRecords.map((p) => Object.values(p));
		const footnotes = format !== InspectFormat.CSV ? getFootnotes(type, rows, header) : [];
		console.log(await formatTable(format, header, rows));
		if (footnotes.length) console.log(footnotes.join('\n'));
		if (report[type].warnings) {
			report[type].warnings.forEach((warning) => logger.warn(formatParagraph(warning)));
		}
		console.log('\n');
	}
}

async function formatTable(
		format: InspectFormat,
		head: string[],
		rows: string[][]): Promise<string> {
	switch (format) {
		case InspectFormat.PRETTY: {
			const table = new CLITable({head});
			table.push(...rows);
			return table.toString();
		}
		case InspectFormat.CSV:
			return new Promise((resolve, reject) => {
				stringify([head, ...rows], (err, output) => {
					err ? reject(err) : resolve(output);
				});
			});
		case InspectFormat.MD:
			return mdTable([head, ...rows]);
	}

}

function formatPropertyReport(property, index, format: InspectFormat) {
	const row = {'#': index};
	for (const key in property) {
		const value = property[key];
		if (Array.isArray(value)) {
			row[key] = value.join(', ');
		} else if (key.match(/size/i) && format !== InspectFormat.CSV) {
			row[key] = value > 0 ? formatBytes(value) : '';
		} else if (typeof value === 'number') {
			row[key] = format !== InspectFormat.CSV ? formatLong(value) : value;
		} else if (typeof value === 'boolean') {
			row[key] = value ? '✓' : '';
		} else {
			row[key] = value;
		}
	}
	return row;
}

function getFootnotes(type: string, rows: string[][], header: string[]): string[] {
	const footnotes = [];
	if (type === 'meshes') {
		for (let i = 0; i < header.length; i++) {
			if (header[i] === 'size') header[i] += '¹';
		}
		footnotes.push(''
			+ '¹ size estimates GPU memory required by a mesh, in isolation. If accessors are\n'
			+ '  shared by other mesh primitives, but the meshes themselves are not reused, then\n'
			+ '  the sum of all mesh sizes will overestimate the asset\'s total size. See "dedup".'
		);
	}
	if (type === 'textures') {
		for (let i = 0; i < header.length; i++) {
			if (header[i] === 'gpuSize') header[i] += '¹';
		}
		footnotes.push(''
			+ '¹ gpuSize estimates minimum GPU memory allocation. Older devices may require\n'
			+ '  additional memory for GPU compression formats.'
		);
	}
	return footnotes;
}
