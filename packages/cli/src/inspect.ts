import * as Table from 'cli-table3';
import { JSONDocument, Logger, NodeIO, WebIO } from '@gltf-transform/core';
import { inspect as inspectDoc } from '@gltf-transform/lib';
import { formatBytes, formatHeader, formatLong, formatParagraph } from './util';

export function inspect (jsonDoc: JSONDocument, io: NodeIO | WebIO, logger: Logger): void {
	// Summary (does not require parsing).
	const extensionsUsed = jsonDoc.json.extensionsUsed || [];
	const extensionsRequired = jsonDoc.json.extensionsRequired || [];
	const table = new Table();
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

		const formattedProperties = properties.map(formatPropertyReport);
		const table = new Table({head: Object.keys(formattedProperties[0])});
		table.push(...formattedProperties.map((p) => Object.values(p)));

		console.log(table.toString());
		if (report[type].warnings) {
			report[type].warnings.forEach((warning) => logger.warn(formatParagraph(warning)));
		}
		console.log('\n');
	}
}

function formatPropertyReport(property, index) {
	const row = {'#': index};
	for (const key in property) {
		const value = property[key];
		if (Array.isArray(value)) {
			row[key] = value.join(', ');
		} else if (key.match(/size/i)) {
			row[key] = value > 0 ? formatBytes(value) : '';
		} else if (typeof value === 'number') {
			row[key] = formatLong(value);
		} else if (typeof value === 'boolean') {
			row[key] = value ? '✓' : '';
		} else {
			row[key] = value;
		}
	}
	return row;
}
