import fs from 'node:fs/promises';
import path from 'node:path';
import type { ILogger } from '@gltf-transform/core';
import { formatHeader, formatTable, log, TableFormat } from './util.js';

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

const HEADER = ['code', 'message', 'severity', 'pointer'];

export async function validate(input: string, options: ValidateOptions, logger: ILogger): Promise<void> {
	const [buffer, validator] = await Promise.all([fs.readFile(input), import('gltf-validator')]);
	return validator
		.validateBytes(new Uint8Array(buffer), {
			maxIssues: options.limit,
			ignoredIssues: options.ignore,
			externalResourceFunction: async (uri: string) => {
				uri = path.resolve(path.dirname(input), decodeURIComponent(uri));
				return fs.readFile(uri).catch((err) => {
					logger.warn(`Unable to validate "${uri}": ${err.toString()}.`);
					throw err.toString();
				});
			},
		})
		.then(async (report: ValidatorReport) => {
			if (options.format === TableFormat.CSV) {
				await printCSV(report);
			} else {
				await printTable('error', 0, report, logger, options.format);
				await printTable('warning', 1, report, logger, options.format);
				await printTable('info', 2, report, logger, options.format);
				await printTable('hint', 3, report, logger, options.format);
			}
			return report;
		})
		.then((report: ValidatorReport) => {
			if (report.issues.messages.some((message) => message.severity === 0)) {
				throw new Error('Validation detected errors.');
			}
		});
}

async function printCSV(report: ValidatorReport): Promise<void> {
	const messages = report.issues.messages;
	console.log(await formatTable(TableFormat.CSV, HEADER, messages.map(Object.values)));
	return;
}

async function printTable(
	header: string,
	severity: number,
	report: ValidatorReport,
	logger: ILogger,
	format: TableFormat,
): Promise<void> {
	log(formatHeader(header));
	const messages = report.issues.messages.filter((msg) => msg.severity === severity);
	if (messages.length) {
		log(await formatTable(format, HEADER, messages.map(Object.values)));
	} else {
		logger.info(`No ${header}s found.`);
	}
	log('\n');
}
