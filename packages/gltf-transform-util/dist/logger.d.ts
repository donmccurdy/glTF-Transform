declare enum LoggerVerbosity {
    NONE = 3,
    ERROR = 2,
    WARNING = 1,
    INFO = 0
}
/**
 * Logger utility class.
 */
declare class Logger {
    private name;
    private verbosity;
    constructor(name: string, verbosity: LoggerVerbosity);
    /**
     * Logs at level INFO.
     * @param text
     */
    info(text: string): void;
    /**
     * Logs at level WARNING.
     * @param text
     */
    warn(text: string): void;
    /**
     * Logs at level ERROR.
     * @param text
     */
    error(text: string): void;
}
export { Logger, LoggerVerbosity };
