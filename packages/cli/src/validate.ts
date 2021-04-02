import fs from 'fs';
import path from 'path';
import CLITable from 'cli-table3';
import validator from 'gltf-validator';
import { Logger } from '@gltf-transform/core';
import { formatHeader } from './util';

export interface ValidateOptions {
	limit: number;
	ignore: string[];
}

interface ValidatorReport {
	issues: {messages: ValidatorMessage[]};
}

interface ValidatorMessage {
	severity: number;
}

export function validate(input: string, options: ValidateOptions, logger: Logger): void {
	const buffer = fs.readFileSync(input);
	return validator.validateBytes(new Uint8Array(buffer), {
			maxIssues: options.limit,
			ignoredIssues: options.ignore,
			externalResourceFunction: (uri: string) =>
			new Promise((resolve, reject) => {
				uri = path.resolve(path.dirname(input), decodeURIComponent(uri));
				fs.readFile(uri, (err, data) => {
					if (err) logger.warn(`Unable to validate "${uri}": ${err.toString()}.`);
					err ? reject(err.toString()) : resolve(data);
				});
			})
		}).then((report: ValidatorReport) => {
			printIssueSection('error', 0, report, logger);
			printIssueSection('warning', 1, report, logger);
			printIssueSection('info', 2, report, logger);
			printIssueSection('hint', 3, report, logger);
		});
}

function printIssueSection(
		header: string,
		severity: number,
		report: ValidatorReport,
		logger: Logger): void {
	console.log(formatHeader(header));
	const messages = report.issues.messages.filter((msg) => msg.severity === severity);
	if (messages.length) {
		const table = new CLITable({head: ['code', 'message', 'severity', 'pointer']});
		table.push(...messages.map((m) => Object.values(m)));
		console.log(table.toString());
	} else {
		logger.info(`No ${header}s found.`);
	}
	console.log('\n');
}
