import * as vscode from 'vscode';

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  stack?: string;
}

const MAX_BUFFER_SIZE = 500;
const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.Debug]: 'DEBUG',
  [LogLevel.Info]: 'INFO',
  [LogLevel.Warn]: 'WARN',
  [LogLevel.Error]: 'ERROR',
};

class Logger {
  private channel: vscode.OutputChannel | undefined;
  private buffer: LogEntry[] = [];
  private minLevel: LogLevel = LogLevel.Info;

  /** Called once from activate(). */
  initialize(context: vscode.ExtensionContext): void {
    this.channel = vscode.window.createOutputChannel('MaintainabilityAI');
    context.subscriptions.push(this.channel);

    if (context.extensionMode === vscode.ExtensionMode.Development) {
      this.minLevel = LogLevel.Debug;
    }
  }

  debug(message: string): void { this.log(LogLevel.Debug, message); }
  info(message: string): void { this.log(LogLevel.Info, message); }
  warn(message: string): void { this.log(LogLevel.Warn, message); }

  error(message: string, err?: unknown): void {
    const stack = err instanceof Error ? err.stack : undefined;
    this.log(LogLevel.Error, message, stack);
  }

  /** Get all buffered entries (for bug report). */
  getBufferedEntries(): readonly LogEntry[] {
    return this.buffer;
  }

  /** Export buffer as formatted text for bug report / clipboard. */
  exportLog(): string {
    return this.buffer
      .map(e => {
        const label = LEVEL_LABELS[e.level];
        const line = `[${e.timestamp}] [${label}] ${e.message}`;
        return e.stack ? `${line}\n${e.stack}` : line;
      })
      .join('\n');
  }

  /** Show the OutputChannel panel to the user. */
  show(): void {
    this.channel?.show(true);
  }

  private log(level: LogLevel, message: string, stack?: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      stack,
    };

    // Always buffer so bug reports have full history
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }

    // Only write to OutputChannel if at or above threshold
    if (level >= this.minLevel) {
      const label = LEVEL_LABELS[level];
      this.channel?.appendLine(`[${entry.timestamp}] [${label}] ${message}`);
      if (stack) { this.channel?.appendLine(stack); }
    }
  }
}

/** Singleton logger instance. Call logger.initialize(context) in activate(). */
export const logger = new Logger();
