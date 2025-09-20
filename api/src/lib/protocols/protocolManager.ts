import EventEmitter from 'node:events';
import { classifyError, isRetryable, ProtocolError, toOrchestrationError } from '../errors.js';
import { withRetry } from '../utils/retry.js';
import type {
  Credentials,
  FirmwareUpdateRequest,
  FirmwareUpdateResult,
  ProtocolCapability,
  ProtocolClient,
  ProtocolDetectionResult,
  ProtocolFallbackContext,
  ProtocolHealth,
  ProtocolType,
  ServerIdentity
} from './types.js';

export interface ProtocolManagerOptions {
  logger?: (event: ProtocolManagerEvent) => void;
  healthPollIntervalMs?: number;
}

export type ProtocolManagerEvent =
  | { type: 'capability-detected'; capability: ProtocolCapability }
  | { type: 'health-check'; health: ProtocolHealth }
  | { type: 'fallback'; context: ProtocolFallbackContext }
  | { type: 'update-attempt'; protocol: ProtocolType; request: FirmwareUpdateRequest }
  | { type: 'update-result'; protocol: ProtocolType; result: FirmwareUpdateResult };

export class ProtocolManager extends EventEmitter {
  private readonly clients: ProtocolClient[];
  private readonly options: ProtocolManagerOptions;

  constructor(clients: ProtocolClient[], options: ProtocolManagerOptions = {}) {
    super();
    this.clients = [...clients].sort((a, b) => a.priority - b.priority);
    this.options = options;
  }

  async detect(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolDetectionResult> {
    const capabilities: ProtocolCapability[] = [];
    for (const client of this.clients) {
      try {
        const capability = await client.detectCapability(identity, credentials);
        if (capability.supported) {
          this.emitEvent({ type: 'capability-detected', capability });
        }
        capabilities.push(capability);
      } catch (error) {
        const orchestrated = toOrchestrationError(error, `Failed to detect capability for ${client.protocol}`, {
          host: identity.host,
          protocol: client.protocol,
          operation: 'detect'
        });
        capabilities.push({
          protocol: client.protocol,
          supported: false,
          updateModes: [],
          raw: { error: orchestrated.message }
        });
      }
    }

    const healthiestProtocol = capabilities
      .filter(cap => cap.supported)
      .sort((a, b) => {
        const priorityA = this.clientFor(a.protocol)?.priority ?? Number.MAX_SAFE_INTEGER;
        const priorityB = this.clientFor(b.protocol)?.priority ?? Number.MAX_SAFE_INTEGER;
        return priorityA - priorityB;
      })[0];

    return { identity, capabilities, healthiestProtocol };
  }

  async runUpdate(request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    let attempt = 0;
    const errors: unknown[] = [];
    for (const client of this.clients) {
      attempt += 1;
      const capability = await client.detectCapability({ host: request.host }, request.credentials).catch(() => ({
        protocol: client.protocol,
        supported: false,
        updateModes: []
      } as ProtocolCapability));
      if (!capability.supported || !capability.updateModes.includes(request.mode)) {
        continue;
      }
      this.emitEvent({ type: 'update-attempt', protocol: client.protocol, request });
      try {
        const result = await withRetry(() => client.performFirmwareUpdate(request), {
          maxAttempts: 3,
          onRetry: (error, retryAttempt, delay) => {
            this.emitEvent({
              type: 'fallback',
              context: { attempt: retryAttempt, error, protocol: client.protocol }
            });
            this.options.logger?.({
              type: 'fallback',
              context: { attempt: retryAttempt, error, protocol: client.protocol }
            });
            this.options.logger?.({
              type: 'health-check',
              health: {
                protocol: client.protocol,
                status: 'degraded',
                checkedAt: Date.now(),
                details: `Retry in ${delay}ms`,
                lastErrorClassification: classifyError(error)
              }
            });
          }
        });
        this.emitEvent({ type: 'update-result', protocol: client.protocol, result });
        return result;
      } catch (error) {
        errors.push(error);
        const classification = classifyError(error);
        this.emitEvent({
          type: 'fallback',
          context: { attempt, error, protocol: client.protocol }
        });
        if (!isRetryable(error) && classification !== 'transient') {
          continue;
        }
      }
    }

    const failure = errors[errors.length - 1];
    if (failure instanceof Error) {
      throw failure;
    }
    throw new ProtocolError('All protocol fallbacks exhausted', 'REDFISH', 'critical', {
      host: request.host,
      operation: 'firmware-update'
    });
  }

  async health(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolHealth[]> {
    const results: ProtocolHealth[] = [];
    for (const client of this.clients) {
      try {
        const health = await client.healthCheck(identity, credentials);
        this.emitEvent({ type: 'health-check', health });
        results.push(health);
      } catch (error) {
        results.push({
          protocol: client.protocol,
          status: 'unreachable',
          checkedAt: Date.now(),
          details: error instanceof Error ? error.message : String(error),
          lastErrorClassification: classifyError(error)
        });
      }
    }
    return results;
  }

  private clientFor(protocol: ProtocolType) {
    return this.clients.find(client => client.protocol === protocol);
  }

  private emitEvent(event: ProtocolManagerEvent) {
    this.options.logger?.(event);
    this.emit(event.type, event);
  }

  async dispose() {
    await Promise.allSettled(this.clients.map(client => client.close?.()));
  }
}
