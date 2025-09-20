import { isNativeError } from './utils/errorGuards.js';

export type ErrorClassification = 'transient' | 'permanent' | 'critical';

export interface ErrorContext {
  host?: string;
  protocol?: string;
  operation?: string;
  component?: string;
  attempt?: number;
  metadata?: Record<string, unknown>;
}

export class OrchestrationError extends Error {
  constructor(
    message: string,
    public readonly classification: ErrorClassification,
    public readonly context: ErrorContext = {},
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'OrchestrationError';
  }
}

export class ProtocolError extends OrchestrationError {
  constructor(
    message: string,
    public readonly protocol: string,
    classification: ErrorClassification = 'transient',
    context: ErrorContext = {},
    cause?: unknown
  ) {
    super(message, classification, { ...context, protocol }, cause);
    this.name = 'ProtocolError';
  }
}

export class ValidationError extends OrchestrationError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'permanent', context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ProtocolError {
  constructor(message: string, protocol: string, context: ErrorContext = {}, cause?: unknown) {
    super(message, protocol, 'permanent', context, cause);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ProtocolError {
  constructor(message: string, protocol: string, context: ErrorContext = {}, cause?: unknown) {
    super(message, protocol, 'permanent', context, cause);
    this.name = 'AuthorizationError';
  }
}

export class TimeoutError extends ProtocolError {
  constructor(message: string, protocol: string, context: ErrorContext = {}, cause?: unknown) {
    super(message, protocol, 'transient', context, cause);
    this.name = 'TimeoutError';
  }
}

export class DependencyError extends OrchestrationError {
  constructor(message: string, context: ErrorContext = {}, cause?: unknown) {
    super(message, 'critical', context, cause);
    this.name = 'DependencyError';
  }
}

export function classifyError(error: unknown): ErrorClassification {
  if (error instanceof OrchestrationError) {
    return error.classification;
  }
  if (error && typeof error === 'object') {
    const status = (error as Record<string, unknown>).status;
    if (typeof status === 'number') {
      if (status >= 500 || status === 404) return 'transient';
      if (status === 401 || status === 403) return 'permanent';
      if (status >= 400) return 'permanent';
    }
    const code = (error as NodeJS.ErrnoException).code;
    if (typeof code === 'string') {
      if (['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'].includes(code)) {
        return 'transient';
      }
    }
  }
  if (isNativeError(error)) {
    const msg = error.message || '';
    if (/(timeout|timed out|network|socket|hang up|reset)/i.test(msg)) {
      return 'transient';
    }
  }
  return 'permanent';
}

export function isRetryable(error: unknown): boolean {
  return classifyError(error) === 'transient';
}

export function toOrchestrationError(error: unknown, fallbackMessage: string, context: ErrorContext = {}): OrchestrationError {
  if (error instanceof OrchestrationError) {
    return error;
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  return new OrchestrationError(message, classifyError(error), context, error);
}
