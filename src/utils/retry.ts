/**
 * Retry utility with exponential backoff
 */

import logger from './logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 500,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown retry error');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      if (onRetry) {
        onRetry(attempt, lastError, delayMs);
      }

      logger.debug(`Retry attempt ${attempt}/${maxAttempts}, waiting ${delayMs}ms`, {
        error: lastError.message,
      });

      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> {
  const { timeoutMs = 10000, intervalMs = 500 } = options;
  const deadline = Date.now() + timeoutMs;

  do {
    try {
      if (await condition()) {
        return;
      }
    } catch (error) {
      logger.debug('Condition check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (Date.now() >= deadline) {
      throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  } while (Date.now() < deadline);

  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}
