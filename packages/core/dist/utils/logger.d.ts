/**
 * # Logger
 *
 * *Logger utility class.*
 *
 * @category Utilities
 */
declare class Logger {
    private readonly verbosity;
    /**
     * Log verbosity thresholds.
     */
    static Verbosity: {
        /** No events are logged. */
        SILENT: number;
        /** Only error events are logged. */
        ERROR: number;
        /** Only error and warn events are logged. */
        WARN: number;
        /** Only error, warn, and info events are logged. (DEFAULT) */
        INFO: number;
        /** All events are logged. */
        DEBUG: number;
    };
    /** Default logger instance. */
    static DEFAULT_INSTANCE: Logger;
    /** Constructs a new Logger instance. */
    constructor(verbosity: number);
    /** Logs an event at level {@link Logger.Verbosity.DEBUG}. */
    debug(text: string): void;
    /** Logs an event at level {@link Logger.Verbosity.INFO}. */
    info(text: string): void;
    /** Logs an event at level {@link Logger.Verbosity.WARN}. */
    warn(text: string): void;
    /** Logs an event at level {@link Logger.Verbosity.ERROR}. */
    error(text: string): void;
}
export { Logger };
