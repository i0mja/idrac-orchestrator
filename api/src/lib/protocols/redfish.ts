import { classifyError, ProtocolError } from '../errors.js';
import type {
  Credentials,
  FirmwareUpdateRequest,
  FirmwareUpdateResult,
  ProtocolCapability,
  ProtocolClient,
  ProtocolHealth,
  ServerIdentity
} from './types.js';
import {
  DEFAULT_DELL_CATALOG_URL,
  RedfishActionMissingError,
  RedfishClient,
  RedfishError,
  normalizeBaseUrl
} from '../redfish/client.js';

export class RedfishProtocolClient implements ProtocolClient {
  readonly protocol = 'REDFISH' as const;
  readonly priority = 10;

  async detectCapability(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolCapability> {
    const client = this.createClient(identity.host, credentials);
    try {
      const capabilities = await client.enumerateCapabilities();
      const generation = detectGeneration(capabilities.firmwareVersion);
      return {
        protocol: this.protocol,
        supported: Boolean(capabilities.simpleUpdate || capabilities.installFromRepository || capabilities.multipart),
        firmwareVersion: capabilities.firmwareVersion,
        generation,
        updateModes: collectUpdateModes(capabilities),
        raw: capabilities.raw
      };
    } catch (error) {
      return {
        protocol: this.protocol,
        supported: false,
        updateModes: [],
        raw: { error: error instanceof Error ? error.message : String(error) }
      };
    } finally {
      await client.destroy();
    }
  }

  async healthCheck(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolHealth> {
    const client = this.createClient(identity.host, credentials);
    const startedAt = Date.now();
    try {
      await client.serviceRoot();
      return { protocol: this.protocol, status: 'healthy', checkedAt: Date.now(), latencyMs: Date.now() - startedAt };
    } catch (error) {
      return {
        protocol: this.protocol,
        status: 'unreachable',
        checkedAt: Date.now(),
        details: error instanceof Error ? error.message : String(error),
        lastErrorClassification: classifyError(error),
        latencyMs: Date.now() - startedAt
      };
    } finally {
      await client.destroy();
    }
  }

  async performFirmwareUpdate(request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    const client = this.createClient(request.host, request.credentials);
    const startedAt = Date.now();
    try {
      if (request.mode === 'INSTALL_FROM_REPOSITORY') {
        const res = await client.installFromRepository({ repository: request.repositoryUrl ?? DEFAULT_DELL_CATALOG_URL });
        return buildResult(this.protocol, startedAt, res.taskLocation, res.body);
      }
      if (request.mode === 'SIMPLE_UPDATE') {
        const component = request.components[0];
        if (!component?.imageUri) throw new ProtocolError('Image URI required for SimpleUpdate', this.protocol, 'permanent');
        const res = await client.simpleUpdate({ imageUri: component.imageUri, applyTime: request.applyTime, targets: request.additionalParams?.targets as string[] | undefined });
        return buildResult(this.protocol, startedAt, res.taskLocation, res.body);
      }
      if (request.mode === 'MULTIPART_UPDATE') {
        const component = request.components[0];
        if (!component?.stream || !component?.fileName) {
          throw new ProtocolError('Multipart update requires stream and fileName', this.protocol, 'permanent');
        }
        const res = await client.multipartUpdate({
          fileName: component.fileName,
          fileStream: component.stream,
          size: component.metadata?.size as number | undefined,
          updateParameters: request.additionalParams
        });
        return buildResult(this.protocol, startedAt, res.taskLocation, res.body);
      }
      throw new ProtocolError(`Unsupported Redfish mode ${request.mode}`, this.protocol, 'permanent');
    } catch (error) {
      if (error instanceof RedfishActionMissingError) {
        throw new ProtocolError(error.message, this.protocol, 'permanent', { metadata: { action: error.action } }, error);
      }
      if (error instanceof RedfishError) {
        throw new ProtocolError(error.message, this.protocol, classifyError(error), {}, error);
      }
      throw error;
    } finally {
      await client.destroy();
    }
  }

  private createClient(host: string, credentials: Credentials) {
    return new RedfishClient({ baseUrl: normalizeBaseUrl(host), credentials });
  }
}

function buildResult(protocol: string, startedAt: number, taskLocation?: string | null, body?: unknown): FirmwareUpdateResult {
  return {
    protocol: protocol as any,
    startedAt,
    completedAt: undefined,
    status: 'QUEUED',
    taskLocation,
    jobId: taskLocation,
    messages: body ? [JSON.stringify(body)] : []
  };
}

function collectUpdateModes(capabilities: any) {
  const modes: FirmwareUpdateRequest['mode'][] = [];
  if (capabilities.simpleUpdate) modes.push('SIMPLE_UPDATE');
  if (capabilities.installFromRepository) modes.push('INSTALL_FROM_REPOSITORY');
  if (capabilities.multipart) modes.push('MULTIPART_UPDATE');
  return modes;
}

function detectGeneration(version?: string) {
  if (!version) return 'UNKNOWN';
  const major = Number(version.split('.')[0]);
  if (major <= 2) return '11G';
  if (major === 3) return '12G';
  if (major === 4) return '13G';
  if (major === 5) return '14G';
  if (major === 6) return '15G';
  if (major >= 7) return '16G';
  return 'UNKNOWN';
}
