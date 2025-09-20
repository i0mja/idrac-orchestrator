import { exponentialBackoff, sleep } from './time.js';
import { classifyError, isRetryable, OrchestrationError } from '../errors.js';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  classify?: (error: unknown) => 'retry' | 'abort';
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void | Promise<void>;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 60_000;

  let attempt = 0;
  let lastError: unknown;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classification = options.classify?.(error);
      const retryable = classification ? classification === 'retry' : isRetryable(error);
      if (!retryable) {
        throw error;
      }
      const delay = exponentialBackoff(attempt, baseDelayMs, maxDelayMs);
      await Promise.resolve(options.onRetry?.(error, attempt + 1, delay));
      await sleep(delay);
      attempt += 1;
    }
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new OrchestrationError('Retry attempts exhausted', classifyError(lastError));
}
