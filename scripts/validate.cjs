#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const validator = require('gltf-validator');

const verbose = process.argv.indexOf('--verbose') > 0;

const messages = {
	numAssets: 0,
	numFailed: 0,
	numErrors: 0,
	numWarnings: 0,
	numInfos: 0,
	numHints: 0,
	failed: [],
	reports: [],
};

const pending = [];

const validateURI = (uri) => {
	const asset = fs.readFileSync(uri);
	const dir = path.dirname(uri);
	const promise = validator
		.validateBytes(new Uint8Array(asset), {
			uri,
			externalResourceFunction: (uri) =>
				new Promise((resolve) => {
					uri = path.resolve(dir, decodeURIComponent(uri));
					const buffer = fs.readFileSync(uri);
					resolve(new Uint8Array(buffer));
				}),
		})
		.then((report) => {
			messages.numAssets++;
			messages.numErrors += report.issues.numErrors;
			messages.numWarnings += report.issues.numWarnings;
			messages.numInfos += report.issues.numInfos;
			messages.numHints += report.issues.numHints;
			if (verbose) {
				messages.reports.push(report);
			}
			if (report.issues.numErrors || report.issues.numWarnings) {
				messages.failed.push(uri);
			}
		})
		.catch((error) => {
			messages.numFailed++;
			failed.push([uri, error]);
		});
	pending.push(promise);
};

glob.sync(path.join(__dirname, '../packages/*/test/out/**/*.glb')).forEach(validateURI);
glob.sync(path.join(__dirname, '../packages/*/test/out/**/*.gltf')).forEach(validateURI);

Promise.all(pending)
	.catch(() => true)
	.then(() => {
		console.log(JSON.stringify(messages, null, 2));
		if (messages.numFailed || messages.numErrors || messages.numWarnings) {
			process.exit(2);
		}
	});
