/**
 * Logger utility for consistent logging across the application
 * Supports different log levels and environment-based output
 */

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

class Logger {
  /**
   * Log info messages (only in development)
   */
  static info(...args) {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Log debug messages (only when DEBUG=true)
   */
  static debug(...args) {
    if (isDevelopment && process.env.DEBUG === "true") {
      console.log("🔍 [DEBUG]", ...args);
    }
  }

  /**
   * Log SQL debug messages (only when DEBUG_SQL=true)
   */
  static sql(...args) {
    if (isDevelopment && process.env.DEBUG_SQL === "true") {
      console.log("🔍 [SQL]", ...args);
    }
  }

  /**
   * Log warnings (always logged)
   */
  static warn(...args) {
    console.warn("⚠️ [WARN]", ...args);
  }

  /**
   * Log errors (always logged, but sanitized in production)
   */
  static error(...args) {
    if (isProduction) {
      // In production, only log error messages, not stack traces
      const sanitized = args.map(arg => {
        if (arg instanceof Error) {
          return {
            message: arg.message,
            code: arg.code,
            name: arg.name
          };
        }
        return arg;
      });
      console.error("❌ [ERROR]", ...sanitized);
    } else {
      console.error("❌ [ERROR]", ...args);
    }
  }

  /**
   * Log success messages (only in development)
   */
  static success(...args) {
    if (isDevelopment) {
      console.log("✅ [SUCCESS]", ...args);
    }
  }
}

export default Logger;

