import * as CLITable from 'cli-table3';
import * as stringifyNamespace from 'csv-stringify';
import * as mdTableNamespace from 'markdown-table';
import { JSONDocument, Logger, NodeIO, WebIO } from '@gltf-transform/core';
import { inspect as inspectDoc } from '@gltf-transform/lib';
import { formatBytes, formatHeader, formatLong, formatParagraph } from './util';

// eslint-disable-next-line @typescript-eslint/ban-types
const stringify = stringifyNamespace['default'] as Function;
// eslint-disable-next-line @typescript-eslint/ban-types
const mdTable = mdTableNamespace['default'] as Function;

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
	const table = new CLITable();
	table.push(
		{generator: jsonDoc.json.asset.generator || ''},
		{version: jsonDoc.json.asset.version},
		{extensionsUsed: extensionsUsed.join(', ') || 'none'},
		{extensionsRequired: extensionsRequired.join(', ') || 'none'},
	);
	console.log(formatHeader('info'));
	console.log(table.toString() + '\n');

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
		const formattedRows = formattedRecords.map((p) => Object.values(p));
		const head = Object.keys(formattedRecords[0]);
		console.log(await formatTable(format, head, formattedRows));
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
