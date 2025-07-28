import {
	program as _program,
	type Validator as CaporalValidator,
	type Command,
	type ParsedOption,
	type Logger as WinstonLogger,
} from '@donmccurdy/caporal';
import { type ILogger, Verbosity } from '@gltf-transform/core';

const PAD_EMOJI = new Set(['🫖', '🖼', '⏯']);

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
	version(version: string): this {
		_program.version(version);
		return this;
	}
	description(desc: string): this {
		_program.description(desc);
		return this;
	}
	help(help: string, options?: IHelpOptions): this {
		_program.help(help, options);
		return this;
	}
	section(_name: string, _icon: string): this {
		const icon = _icon + (PAD_EMOJI.has(_icon) ? ' ' : '');
		const name = _name.toUpperCase();
		const line = ''.padEnd(50 - name.length - 1, '─');
		_program.command('', `\n\n${icon} ${name} ${line}`);
		return this;
	}
	command(name: string, desc: string): ICommand {
		return new CommandImpl(_program, name, desc);
	}
	option<T>(name: string, desc: string, options: IProgramOptions<T>): this {
		// biome-ignore lint/suspicious/noExplicitAny: TODO
		_program.option(name, desc, { global: true, ...options } as any);
		return this;
	}
	disableGlobalOption(name: string): this {
		_program.disableGlobalOption(name);
		return this;
	}
	run(): this {
		_program.run();
		return this;
	}
	async exec(args: unknown[], options?: IExecOptions): Promise<void> {
		// biome-ignore lint/suspicious/noExplicitAny: TODO
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
			// biome-ignore lint/suspicious/noExplicitAny: TODO
			const logger = new Logger(args.logger as any);
			// biome-ignore lint/suspicious/noExplicitAny: TODO
			return fn({ ...args, logger } as any);
		});
		return this;
	}
	alias(name: string) {
		this._ctx.alias(name);
		return this;
	}
}

export const program: ProgramImpl = new ProgramImpl();

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
	getVerbosity(): Verbosity {
		return this._verbosity;
	}
	setVerbosity(verbosity: Verbosity): void {
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
	debug(msg: string): void {
		this._logger.debug(msg);
	}
	info(msg: string): void {
		this._logger.info(msg);
	}
	warn(msg: string): void {
		this._logger.warn(msg);
	}
	error(msg: string): void {
		this._logger.error(msg);
	}
}
