enum LoggerVerbosity {
  NONE = 3,
  ERROR = 2,
  WARNING = 1,
  INFO = 0,
}

/**
 * Logger utility class.
 */
class Logger {
  constructor (private name: string, private verbosity: LoggerVerbosity) {}

  /**
   * Logs at level INFO.
   * @param text
   */
  info (text: string) {
    if (this.verbosity >= LoggerVerbosity.INFO) {
      console.log(`${this.name}: ${text}`);
    }
  }

  /**
   * Logs at level WARNING.
   * @param text
   */
  warn (text: string) {
    if (this.verbosity >= LoggerVerbosity.WARNING) {
      console.warn(`${this.name}: ${text}`);
    }
  }

  /**
   * Logs at level ERROR.
   * @param text
   */
  error (text: string) {
    if (this.verbosity >= LoggerVerbosity.ERROR) {
      console.error(`${this.name}: ${text}`);
    }
  }

}

export { Logger, LoggerVerbosity };
