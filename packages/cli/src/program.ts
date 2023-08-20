import caporal from '@caporal/core';
import { ILogger, Verbosity } from '@gltf-transform/core';

const PAD_EMOJI = new Set(['🫖', '🖼', '⏯️']);

/**********************************************************************************************
 * Program.
 */

export interface IProgram {
	command: (name: string, desc: string) => ICommand;
	option: (name: string, desc: string, options: IProgramOptions) => this;
	section: (name: string, icon: string) => this;
}

interface IInternalProgram extends IProgram {
	version: (version: string) => this;
	description: (desc: string) => this;
	disableGlobalOption: (name: string) => this;
	run: () => this;
}

export interface IProgramOptions<T = unknown> {
	default?: T;
	validator?: ValidatorFn | T[];
	action?: IActionFn;
}

export type IActionFn = (params: {
	args: Record<string, unknown>;
	options: Record<string, unknown>;
	logger: Logger;
}) => void;

class Program implements IInternalProgram {
	version(version: string) {
		caporal.program.version(version);
		return this;
	}
	description(desc: string) {
		caporal.program.description(desc);
		return this;
	}
	section(_name: string, _icon: string) {
		const icon = _icon + (PAD_EMOJI.has(_icon) ? ' ' : '');
		const name = _name.toUpperCase();
		const line = ''.padEnd(50 - name.length - 1, '─');
		caporal.program.command('', `\n\n${icon} ${name} ${line}`);
		return this;
	}
	command(name: string, desc: string): ICommand {
		return new Command(caporal.program, name, desc);
	}
	option<T>(name: string, desc: string, options: IProgramOptions<T>) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		caporal.program.option(name, desc, { global: true, ...options } as any);
		return this;
	}
	disableGlobalOption(name: string) {
		caporal.program.disableGlobalOption(name);
		return this;
	}
	run() {
		caporal.program.run();
		return this;
	}
}

/**********************************************************************************************
 * Command.
 */

export interface ICommand {
	help: (text: string) => this;
	argument: (name: string, desc: string) => this;
	option: (name: string, desc: string, options?: ICommandOptions) => this;
	action: (fn: IActionFn) => this;
	alias: (name: string) => this;
}

export interface ICommandOptions {}

class Command implements ICommand {
	_ctx: caporal.Command;
	constructor(program: typeof caporal.program, name: string, desc: string) {
		this._ctx = program.command(name, desc);
	}
	help(text: string) {
		this._ctx.help(text);
		return this;
	}
	argument(name: string, desc: string) {
		this._ctx.argument(name, desc);
		return this;
	}
	option(name: string, desc: string, options?: ICommandOptions) {
		this._ctx.option(name, desc, options);
		return this;
	}
	action(fn: IActionFn) {
		this._ctx.action(async ({ logger: _logger, ...args }) => {
			const logger = new Logger(_logger);
			return fn({ ...args, logger });
		});
		return this;
	}
	alias(name: string) {
		this._ctx.alias(name);
		return this;
	}
}

export const program = new Program();

/**********************************************************************************************
 * Validator.
 */

type ValidatorFn = unknown;
type ValidatorType = 'NUMBER' | 'ARRAY' | 'BOOLEAN' | 'STRING';

export const Validator: Record<ValidatorType, ValidatorFn> = {
	NUMBER: caporal.program.NUMBER,
	ARRAY: caporal.program.ARRAY,
	BOOLEAN: caporal.program.BOOLEAN,
	STRING: caporal.program.STRING,
};

/**********************************************************************************************
 * Logger.
 */

export class Logger implements ILogger {
	_logger: caporal.Logger;
	_verbosity: Verbosity;
	constructor(logger: caporal.Logger) {
		this._logger = logger;

		switch (logger.level) {
			case 'info':
				this._verbosity = Verbosity.INFO;
				break;
			case 'warn':
				this._verbosity = Verbosity.WARN;
				break;
			case 'error':
				this._verbosity = Verbosity.ERROR;
				break;
			case 'debug':
			default:
				this._verbosity = Verbosity.DEBUG;
		}
	}
	getVerbosity() {
		return this._verbosity;
	}
	setVerbosity(verbosity: Verbosity) {
		switch (verbosity) {
			case Verbosity.INFO:
				this._logger.level = 'info';
				break;
			case Verbosity.WARN:
				this._logger.level = 'warn';
				break;
			case Verbosity.ERROR:
				this._logger.level = 'error';
				break;
			case Verbosity.DEBUG:
				this._logger.level = 'debug';
				break;
			default:
				throw new Error(`Unexpected verbosity, "${verbosity}".`);
		}
		this._verbosity = verbosity;
	}
	debug(msg: string) {
		this._logger.debug(msg);
	}
	info(msg: string) {
		this._logger.info(msg);
	}
	warn(msg: string) {
		this._logger.warn(msg);
	}
	error(msg: string) {
		this._logger.error(msg);
	}
}
