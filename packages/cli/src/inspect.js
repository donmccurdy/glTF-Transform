const Table = require('cli-table');
const { inspect: inspectDoc } = require('@gltf-transform/lib');
const { formatBytes, formatHeader, formatLong, formatParagraph } = require('./util');

function inspect (nativeDoc, io, logger) {
	// Summary (does not require parsing).
	const extensionsUsed = nativeDoc.json.extensionsUsed || [];
	const extensionsRequired = nativeDoc.json.extensionsRequired || [];
	const table = new Table();
	table.push(
		{generator: nativeDoc.json.asset.generator || ''},
		{version: nativeDoc.json.asset.version},
		{extensionsUsed: extensionsUsed.join(', ') || 'none'},
		{extensionsRequired: extensionsRequired.join(', ') || 'none'},
	);
	console.log(formatHeader('info'));
	console.log(table.toString() + '\n');

	// Parse.
	let doc;
	try {
		doc = io.createDocument(nativeDoc);
	} catch (e) {
		logger.warn('Unable to parse document.');
		logger.error(e.message);
		return;
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

module.exports = {inspect};
