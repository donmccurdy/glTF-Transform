import {
	program as _program,
	Command,
	ParsedOption,
	Validator as CaporalValidator,
	Logger as WinstonLogger,
} from '@donmccurdy/caporal';
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

interface IExecOptions {
	silent?: boolean;
}

interface IInternalProgram extends IProgram {
	version: (version: string) => this;
	description: (desc: string) => this;
	disableGlobalOption: (name: string) => this;
	run: () => this;
	exec: (args: unknown[], options?: IExecOptions) => Promise<void>;
}

export interface IProgramOptions<T = unknown> {
	default?: T;
	validator?: CaporalValidator;
	action?: IActionFn;
	hidden?: boolean;
}

export type IActionFn = (params: {
	args: Record<string, unknown>;
	options: Record<string, unknown>;
	logger: Logger;
}) => void;

export interface IHelpOptions {
	sectionName?: string;
}

class ProgramImpl implements IInternalProgram {
	version(version: string) {
		_program.version(version);
		return this;
	}
	description(desc: string) {
		_program.description(desc);
		return this;
	}
	help(help: string, options?: IHelpOptions) {
		_program.help(help, options);
		return this;
	}
	section(_name: string, _icon: string) {
		const icon = _icon + (PAD_EMOJI.has(_icon) ? ' ' : '');
		const name = _name.toUpperCase();
		const line = ''.padEnd(50 - name.length - 1, '─');
		_program.command('', `\n\n${icon} ${name} ${line}`);
		return this;
	}
	command(name: string, desc: string): ICommand {
		return new CommandImpl(_program, name, desc);
	}
	option<T>(name: string, desc: string, options: IProgramOptions<T>) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		_program.option(name, desc, { global: true, ...options } as any);
		return this;
	}
	disableGlobalOption(name: string) {
		_program.disableGlobalOption(name);
		return this;
	}
	run() {
		_program.run();
		return this;
	}
	async exec(args: unknown[], options?: IExecOptions) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await _program.exec(args as any, options as any);
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

export interface ICommandOptions {
	required?: boolean;
	default?: ParsedOption;
	validator?: CaporalValidator;
	hidden?: boolean;
}

class CommandImpl implements ICommand {
	_ctx: Command;
	constructor(program: typeof _program, name: string, desc: string) {
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
		this._ctx.action(async (args) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const logger = new Logger(args.logger as any);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return fn({ ...args, logger } as any);
		});
		return this;
	}
	alias(name: string) {
		this._ctx.alias(name);
		return this;
	}
}

export const program = new ProgramImpl();

/**********************************************************************************************
 * Validator.
 */

export const Validator: Record<'NUMBER' | 'ARRAY' | 'BOOLEAN' | 'STRING', CaporalValidator> = {
	NUMBER: _program.NUMBER,
	ARRAY: _program.ARRAY,
	BOOLEAN: _program.BOOLEAN,
	STRING: _program.STRING,
};

/**********************************************************************************************
 * Logger.
 */

export class Logger implements ILogger {
	_logger: WinstonLogger;
	_verbosity: Verbosity;
	constructor(logger: WinstonLogger) {
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
