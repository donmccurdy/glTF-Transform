require('source-map-support').install();

import test from 'tape';
import { Logger } from '../../';

test('@gltf-transform/core::logger', t => {
	const {debug, info, warn, error} = console;

	const calls = {debug: 0, info: 0, warn: 0, error: 0};
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
	t.equals(calls.debug, 0, 'no debug when silenced');
	t.equals(calls.info, 0, 'no info when silenced');
	t.equals(calls.warn, 0, 'no warn when silenced');
	t.equals(calls.error, 0, 'no error when silenced');

	logger = new Logger(Logger.Verbosity.DEBUG);
	logger.debug('debug');
	logger.info('info');
	logger.warn('warn');
	logger.error('error');
	t.equals(calls.debug, 1, 'debug when not silenced');
	t.equals(calls.info, 1, 'info when not silenced');
	t.equals(calls.warn, 1, 'warn when not silenced');
	t.equals(calls.error, 1, 'error when not silenced');

	Object.assign(console, {debug, info, warn, error});
	t.end();
});
