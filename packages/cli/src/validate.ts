import fs from 'node:fs/promises';
import path from 'node:path';
import type { ILogger } from '@gltf-transform/core';
import { formatHeader, formatTable, TableFormat } from './util.js';

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

export async function validate(input: string, options: ValidateOptions, logger: ILogger): Promise<void> {
	const [buffer, validator] = await Promise.all([fs.readFile(input), import('gltf-validator')]);
	return validator
		.validateBytes(new Uint8Array(buffer), {
			maxIssues: options.limit,
			ignoredIssues: options.ignore,
			externalResourceFunction: (uri: string) => {
				uri = path.resolve(path.dirname(input), decodeURIComponent(uri));
				return fs.readFile(uri).catch((err) => {
					logger.warn(`Unable to validate "${uri}": ${err.toString()}.`);
					throw err.toString();
				});
			},
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
	format: TableFormat,
): Promise<void> {
	console.log(formatHeader(header));
	const messages = report.issues.messages.filter((msg) => msg.severity === severity);
	if (messages.length) {
		console.log(
			(await formatTable(
				format,
				['code', 'message', 'severity', 'pointer'],
				messages.map((m) => Object.values(m)),
			)) + '\n\n',
		);
	} else {
		logger.info(`No ${header}s found.`);
	}
	console.log('\n');
}
