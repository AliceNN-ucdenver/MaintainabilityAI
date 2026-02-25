import * as vscode from 'vscode';
import { logger } from './Logger';

/** Extract a human-readable message from any caught value. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) { return err.message; }
  return String(err);
}

export interface HandleErrorOptions {
  /** Show vscode.window.showErrorMessage notification. Default: false. */
  showNotification?: boolean;
  /** Log the full stack trace. Default: true. */
  logStack?: boolean;
}

/**
 * Centralized error handler: logs via Logger, optionally shows notification.
 * Returns the formatted error message for callers that need it (e.g., postMessage).
 */
export function handleError(
  context: string,
  err: unknown,
  options: HandleErrorOptions = {},
): string {
  const message = toErrorMessage(err);
  const fullMessage = `${context}: ${message}`;
  const { showNotification = false, logStack = true } = options;

  if (logStack) {
    logger.error(fullMessage, err);
  } else {
    logger.error(fullMessage);
  }

  if (showNotification) {
    vscode.window.showErrorMessage(fullMessage);
  }

  return message;
}
