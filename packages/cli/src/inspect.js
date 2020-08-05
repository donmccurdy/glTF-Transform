const Table = require('cli-table');
const { inspect: inspectDoc } = require('@gltf-transform/lib');
const { formatBytes, formatHeader, formatLong, formatParagraph } = require('./util');

function inspect (doc) {
	const logger = doc.getLogger();

	// TODO(feature): Should really be able to get at least this far without parsing.
	const table = new Table();
	table.push(
		{generator: doc.getRoot().getAsset().generator},
		{version: doc.getRoot().getAsset().version},
		{extensionsUsed: doc.getRoot().listExtensionsUsed().join(', ') || 'none'},
		{extensionsRequired: doc.getRoot().listExtensionsRequired().join(', ') || 'none'},
	);
	console.log(formatHeader('info'));
	console.log(table.toString() + '\n');

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
	const row = {index};
	for (const key in property) {
		const value = property[key];
		if (Array.isArray(value)) {
			row[key] = value.join(', ');
		} else if (key === 'size') {
			row[key] = formatBytes(value);
		} else if (typeof value === 'number') {
			row[key] = formatLong(value);
		} else {
			row[key] = value;
		}
	}
	return row;
}

module.exports = {inspect};
