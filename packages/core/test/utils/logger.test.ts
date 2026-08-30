import { strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Logger } from '@gltf-transform/core';

describe('core::Logger', () => {
	test('basic', () => {
		const { debug, info, warn, error } = console;

		const calls = { debug: 0, info: 0, warn: 0, error: 0 };
		Object.assign(console, {
			debug: () => calls.debug++,
			info: () => calls.info++,
			warn: () => calls.warn++,
			error: () => calls.error++,
		});

		let logger = new Logger(Logger.Verbosity.SILENT);
		logger.debug('debug');
		logger.info('info');
		logger.warn('warn');
		logger.error('error');
		strictEqual(calls.debug, 0, 'no debug when silenced');
		strictEqual(calls.info, 0, 'no info when silenced');
		strictEqual(calls.warn, 0, 'no warn when silenced');
		strictEqual(calls.error, 0, 'no error when silenced');

		logger = new Logger(Logger.Verbosity.DEBUG);
		logger.debug('debug');
		logger.info('info');
		logger.warn('warn');
		logger.error('error');
		strictEqual(calls.debug, 1, 'debug when not silenced');
		strictEqual(calls.info, 1, 'info when not silenced');
		strictEqual(calls.warn, 1, 'warn when not silenced');
		strictEqual(calls.error, 1, 'error when not silenced');

		Object.assign(console, { debug, info, warn, error });
	});
});
