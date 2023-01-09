import fs from 'fs';
import path from 'path';
import CLITable from 'cli-table3';
import type Validator from 'gltf-validator';
import type { ILogger } from '@gltf-transform/core';
import { formatHeader, formatTable, TableFormat } from './util';

const validator = createValidator();

/** Creates and returns a 'gltf-validator' instance. */
function createValidator(): typeof Validator {
	// Workaround for https://github.com/GoogleChromeLabs/squoosh/pull/1176.
	const navigator = global.navigator;
	delete (global as unknown as Record<string, unknown>).navigator;
	try {
		return require('gltf-validator');
	} finally {
		global.navigator = navigator;
	}
}

export interface ValidateOptions {
	limit: number;
	ignore: string[];
	format: TableFormat;
}

interface ValidatorReport {
	issues: { messages: ValidatorMessage[] };
}

interface ValidatorMessage {
	severity: number;
}

export function validate(input: string, options: ValidateOptions, logger: ILogger): void {
	const buffer = fs.readFileSync(input);
	return validator
		.validateBytes(new Uint8Array(buffer), {
			maxIssues: options.limit,
			ignoredIssues: options.ignore,
			externalResourceFunction: (uri: string) =>
				new Promise((resolve, reject) => {
					uri = path.resolve(path.dirname(input), decodeURIComponent(uri));
					fs.readFile(uri, (err, data) => {
						if (err) logger.warn(`Unable to validate "${uri}": ${err.toString()}.`);
						err ? reject(err.toString()) : resolve(data);
					});
				}),
		})
		.then(async (report: ValidatorReport) => {
			await printIssueSection('error', 0, report, logger, options.format);
			await printIssueSection('warning', 1, report, logger, options.format);
			await printIssueSection('info', 2, report, logger, options.format);
			await printIssueSection('hint', 3, report, logger, options.format);
		});
}

async function printIssueSection(
	header: string,
	severity: number,
	report: ValidatorReport,
	logger: ILogger,
	format: TableFormat
): Promise<void> {
	console.log(formatHeader(header));
	const messages = report.issues.messages.filter((msg) => msg.severity === severity);
	if (messages.length) {
		console.log(
			(await formatTable(
				format,
				['code', 'message', 'severity', 'pointer'],
				messages.map((m) => Object.values(m))
			)) + '\n\n'
		);
	} else {
		logger.info(`No ${header}s found.`);
	}
	console.log('\n');
}
