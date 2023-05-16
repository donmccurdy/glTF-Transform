/** Logger verbosity thresholds. */
export enum Verbosity {
	/** No events are logged. */
	SILENT = 4,

	/** Only error events are logged. */
	ERROR = 3,

	/** Only error and warn events are logged. */
	WARN = 2,

	/** Only error, warn, and info events are logged. (DEFAULT) */
	INFO = 1,

	/** All events are logged. */
	DEBUG = 0,
}

export interface ILogger {
	debug(text: string): void;
	info(text: string): void;
	warn(text: string): void;
	error(text: string): void;
}

/**
 * *Logger utility class.*
 *
 * @category Utilities
 */
export class Logger implements ILogger {
	/** Logger verbosity thresholds. */
	static Verbosity = Verbosity;

	/** Default logger instance. */
	public static DEFAULT_INSTANCE = new Logger(Logger.Verbosity.INFO);

	/** Constructs a new Logger instance. */
	constructor(private readonly verbosity: number) {}

	/** Logs an event at level {@link Logger.Verbosity.DEBUG}. */
	debug(text: string): void {
		if (this.verbosity <= Logger.Verbosity.DEBUG) {
			console.debug(text);
		}
	}

	/** Logs an event at level {@link Logger.Verbosity.INFO}. */
	info(text: string): void {
		if (this.verbosity <= Logger.Verbosity.INFO) {
			console.info(text);
		}
	}

	/** Logs an event at level {@link Logger.Verbosity.WARN}. */
	warn(text: string): void {
		if (this.verbosity <= Logger.Verbosity.WARN) {
			console.warn(text);
		}
	}

	/** Logs an event at level {@link Logger.Verbosity.ERROR}. */
	error(text: string): void {
		if (this.verbosity <= Logger.Verbosity.ERROR) {
			console.error(text);
		}
	}
}
