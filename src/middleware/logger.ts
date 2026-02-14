// ANSI Color Codes for Pretty Console Output
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  black: "\x1b[30m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

// Log Level Configuration
export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "debug";

// Interface for log data stored on request
export interface RequestLogData {
  id: string;
  startTime: number;
  body?: unknown;
}

// Enhanced Logger Class
export class Logger {
  private startTimes: Map<string, number> = new Map();

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private colorize(level: LogLevel, text: string): string {
    const colorMap: Record<LogLevel, string> = {
      debug: colors.cyan,
      info: colors.green,
      warn: colors.yellow,
      error: colors.red,
    };
    return `${colorMap[level]}${text}${colors.reset}`;
  }

  private getStatusColor(status: number): string {
    if (status >= 500) return colors.bgRed + colors.white;
    if (status >= 400) return colors.bgYellow + colors.black;
    if (status >= 300) return colors.cyan;
    if (status >= 200) return colors.green;
    return colors.gray;
  }

  private truncate(str: string, maxLength: number = 500): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + " ... [truncated]";
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== "object") return body;

    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "authorization",
      "bearer",
    ];
    const sanitized: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
    };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "***REDACTED***";
      }
    }

    return sanitized;
  }

  debug(...args: unknown[]) {
    if (!this.shouldLog("debug")) return;
    const timestamp = this.formatTimestamp();
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${this.colorize("debug", "DEBUG")}`,
      ...args,
    );
  }

  info(...args: unknown[]) {
    if (!this.shouldLog("info")) return;
    const timestamp = this.formatTimestamp();
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${this.colorize("info", "INFO ")}`,
      ...args,
    );
  }

  warn(...args: unknown[]) {
    if (!this.shouldLog("warn")) return;
    const timestamp = this.formatTimestamp();
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${this.colorize("warn", "WARN ")}`,
      ...args,
    );
  }

  error(...args: unknown[]) {
    if (!this.shouldLog("error")) return;
    const timestamp = this.formatTimestamp();
    console.error(
      `${colors.gray}[${timestamp}]${colors.reset} ${this.colorize("error", "ERROR")}`,
      ...args,
    );
  }

  // Request Start Logging
  logRequestStart(
    requestId: string,
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: unknown,
  ) {
    this.startTimes.set(requestId, performance.now());

    console.log(
      `${colors.cyan}┌──────────────────────────────────────────────────────────────${colors.reset}`,
    );
    console.log(
      `${colors.cyan}│${colors.reset} ${colors.bright}REQUEST${colors.reset}  ${colors.magenta}[${requestId}]${colors.reset}`,
    );
    console.log(
      `${colors.cyan}├──────────────────────────────────────────────────────────────${colors.reset}`,
    );
    console.log(
      `${colors.cyan}│${colors.reset} ${colors.yellow}Method:${colors.reset}   ${colors.bright}${method}${colors.reset}`,
    );
    console.log(
      `${colors.cyan}│${colors.reset} ${colors.yellow}URL:${colors.reset}      ${url}`,
    );
    console.log(
      `${colors.cyan}│${colors.reset} ${colors.yellow}Time:${colors.reset}     ${this.formatTimestamp()}`,
    );

    // Log important headers
    const relevantHeaders = ["content-type", "user-agent", "x-forwarded-for"];
    const headerEntries = Object.entries(headers).filter(([key]) =>
      relevantHeaders.includes(key.toLowerCase()),
    );

    if (headerEntries.length > 0) {
      console.log(
        `${colors.cyan}│${colors.reset} ${colors.yellow}Headers:${colors.reset}`,
      );
      headerEntries.forEach(([key, value]) => {
        console.log(
          `${colors.cyan}│${colors.reset}   ${key}: ${this.truncate(String(value), 100)}`,
        );
      });
    }

    if (body && Object.keys(body as object).length > 0) {
      const bodyStr = JSON.stringify(this.sanitizeBody(body), null, 2);
      console.log(
        `${colors.cyan}│${colors.reset} ${colors.yellow}Body:${colors.reset}     ${bodyStr.split("\n").join(`\n${colors.cyan}│${colors.reset}           `)}`,
      );
    }

    console.log(
      `${colors.cyan}└──────────────────────────────────────────────────────────────${colors.reset}`,
    );
  }

  // Route Match Logging
  logRouteMatch(
    requestId: string,
    method: string,
    path: string,
    params: Record<string, string>,
    query: Record<string, string>,
  ) {
    this.debug(
      `${colors.blue}→${colors.reset} [${requestId}] Route matched: ${colors.bright}${method} ${path}${colors.reset}`,
    );

    if (Object.keys(params).length > 0) {
      this.debug(`  Params:`, params);
    }
    if (Object.keys(query).length > 0) {
      this.debug(`  Query:`, query);
    }
  }

  // Response Logging
  logResponse(
    requestId: string,
    method: string,
    url: string,
    status: number,
    responseValue: unknown,
    error?: Error,
  ) {
    const startTime = this.startTimes.get(requestId);
    const duration = startTime
      ? (performance.now() - startTime).toFixed(2)
      : "N/A";
    this.startTimes.delete(requestId);

    const statusColor = this.getStatusColor(status);
    const statusEmoji = status >= 400 ? "❌" : status >= 300 ? "🔄" : "✅";

    console.log(
      `${statusColor}┌──────────────────────────────────────────────────────────────${colors.reset}`,
    );
    console.log(
      `${statusColor}│${colors.reset} ${colors.bright}RESPONSE${colors.reset} ${colors.magenta}[${requestId}]${colors.reset} ${statusEmoji}`,
    );
    console.log(
      `${statusColor}├──────────────────────────────────────────────────────────────${colors.reset}`,
    );
    console.log(
      `${statusColor}│${colors.reset} ${colors.yellow}Method:${colors.reset}   ${method}`,
    );
    console.log(
      `${statusColor}│${colors.reset} ${colors.yellow}URL:${colors.reset}      ${url}`,
    );
    console.log(
      `${statusColor}│${colors.reset} ${colors.yellow}Status:${colors.reset}   ${statusColor}${colors.bright}${status}${colors.reset}`,
    );
    console.log(
      `${statusColor}│${colors.reset} ${colors.yellow}Duration:${colors.reset} ${colors.cyan}${duration}ms${colors.reset}`,
    );

    if (error) {
      console.log(
        `${statusColor}│${colors.reset} ${colors.red}Error:${colors.reset}    ${error.message}`,
      );
      if (error.stack) {
        console.log(
          `${statusColor}│${colors.reset} ${colors.red}Stack:${colors.reset}    ${error.stack.split("\n").join(`\n${statusColor}│${colors.reset}           `)}`,
        );
      }
    } else if (responseValue !== undefined && responseValue !== null) {
      const responseStr =
        typeof responseValue === "object"
          ? JSON.stringify(responseValue, null, 2)
          : String(responseValue);
      console.log(
        `${statusColor}│${colors.reset} ${colors.yellow}Body:${colors.reset}     ${this.truncate(responseStr, 1000).split("\n").join(`\n${statusColor}│${colors.reset}           `)}`,
      );
    }

    console.log(
      `${statusColor}└──────────────────────────────────────────────────────────────${colors.reset}`,
    );
  }

  // Error Logging
  logError(requestId: string, error: Error, context?: string) {
    console.log(
      `${colors.bgRed}${colors.white}┌──────────────────────────────────────────────────────────────${colors.reset}`,
    );
    console.log(
      `${colors.bgRed}${colors.white}│${colors.reset} ${colors.bright}ERROR${colors.reset}    ${colors.magenta}[${requestId}]${colors.reset} ❌`,
    );
    console.log(
      `${colors.bgRed}${colors.white}├──────────────────────────────────────────────────────────────${colors.reset}`,
    );
    if (context) {
      console.log(
        `${colors.bgRed}${colors.white}│${colors.reset} ${colors.yellow}Context:${colors.reset}  ${context}`,
      );
    }
    console.log(
      `${colors.bgRed}${colors.white}│${colors.reset} ${colors.yellow}Message:${colors.reset}  ${error.message}`,
    );
    console.log(
      `${colors.bgRed}${colors.white}│${colors.reset} ${colors.yellow}Stack:${colors.reset}    ${error.stack?.split("\n").join(`\n${colors.bgRed}${colors.white}│${colors.reset}           `)}`,
    );
    console.log(
      `${colors.bgRed}${colors.white}└──────────────────────────────────────────────────────────────${colors.reset}`,
    );
  }

  // Database Operation Logging
  logDBOperation(
    requestId: string,
    operation: string,
    collection: string,
    details?: unknown,
  ) {
    this.debug(
      `${colors.magenta}🗄️${colors.reset} [${requestId}] DB ${operation} on ${colors.bright}${collection}${colors.reset}`,
      details || "",
    );
  }

  // Performance Warning
  logSlowRequest(
    requestId: string,
    duration: number,
    threshold: number = 1000,
  ) {
    if (duration > threshold) {
      this.warn(
        `${colors.yellow}⚠️${colors.reset} [${requestId}] SLOW REQUEST: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
      );
    }
  }

  // Cleanup old start times periodically
  cleanup() {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const now = performance.now();
    for (const [id, start] of this.startTimes.entries()) {
      if (now - start > maxAge) {
        this.startTimes.delete(id);
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Cleanup old request times every minute
setInterval(() => logger.cleanup(), 60000);

// Export log level for display
export { CURRENT_LOG_LEVEL };
