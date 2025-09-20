import { randomUUID } from 'node:crypto';
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
import { normalizeBaseUrl } from '../redfish/client.js';

const WSMAN_ENDPOINT = '/wsman';
const SOFTWARE_INSTALLATION_URI = 'http://schemas.dell.com/wbem/wscim/1/cim-schema/2/DCIM_SoftwareInstallationService';
const SOFTWARE_INSTALLATION_NAME = 'DCIM:SoftwareInstallationService';

function buildHeaders(action: string, resourceUri: string, creds: Credentials) {
  return {
    'content-type': 'application/soap+xml;charset=UTF-8',
    'authorization': 'Basic ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64'),
    'wsman-resource-uri': resourceUri,
    'wsman-action': action
  };
}

function createEnvelope(action: string, resourceUri: string, body: string) {
  const messageId = randomUUID();
  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:wsman="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd">
  <s:Header>
    <wsa:Action>${action}</wsa:Action>
    <wsa:MessageID>uuid:${messageId}</wsa:MessageID>
    <wsa:To>wsman</wsa:To>
    <wsman:ResourceURI>${resourceUri}</wsman:ResourceURI>
  </s:Header>
  <s:Body>
    ${body}
  </s:Body>
</s:Envelope>`;
}

function parseXmlValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\\/${tag}>`, 'i'));
  return match ? match[1] : undefined;
}

async function wsmanRequest(host: string, creds: Credentials, action: string, resource: string, body: string) {
  const baseUrl = normalizeBaseUrl(host);
  const envelope = createEnvelope(action, resource, body);
  const start = Date.now();
  const res = await fetch(`${baseUrl}${WSMAN_ENDPOINT}`, {
    method: 'POST',
    headers: buildHeaders(action, resource, creds),
    body: envelope,
    agent: undefined
  });
  const duration = Date.now() - start;
  const text = await res.text();
  if (!res.ok) {
    throw new ProtocolError(`WSMAN request failed with ${res.status}`, 'WSMAN', classifyError({ status: res.status }), {
      metadata: { duration }
    });
  }
  return { text, duration };
}

export class WsmanProtocolClient implements ProtocolClient {
  readonly protocol = 'WSMAN' as const;
  readonly priority = 20;

  async detectCapability(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolCapability> {
    try {
      const { text } = await wsmanRequest(identity.host, credentials, 'http://schemas.dmtf.org/wbem/wsman/identity/1/Identify',
        'http://schemas.dmtf.org/wbem/wsman/identity/1/Identify', '<Identify/>'
      );
      const product = parseXmlValue(text, 'ProductVendor') ?? parseXmlValue(text, 'ProductVersion');
      const firmwareVersion = parseXmlValue(text, 'ProductVersion');
      const generation = detectGeneration(product ?? firmwareVersion);
      return {
        protocol: this.protocol,
        supported: true,
        firmwareVersion,
        generation,
        updateModes: ['SIMPLE_UPDATE', 'INSTALL_FROM_REPOSITORY'],
        raw: { product, firmwareVersion }
      };
    } catch (error) {
      return {
        protocol: this.protocol,
        supported: false,
        updateModes: [],
        raw: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  async healthCheck(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolHealth> {
    try {
      const { duration } = await wsmanRequest(identity.host, credentials, 'http://schemas.dmtf.org/wbem/wsman/identity/1/Identify',
        'http://schemas.dmtf.org/wbem/wsman/identity/1/Identify', '<Identify/>'
      );
      return {
        protocol: this.protocol,
        status: 'healthy',
        latencyMs: duration,
        checkedAt: Date.now()
      };
    } catch (error) {
      return {
        protocol: this.protocol,
        status: 'unreachable',
        checkedAt: Date.now(),
        details: error instanceof Error ? error.message : String(error),
        lastErrorClassification: classifyError(error)
      };
    }
  }

  async performFirmwareUpdate(request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    if (request.mode === 'INSTALL_FROM_REPOSITORY') {
      return this.installFromRepository(request);
    }
    if (request.mode === 'SIMPLE_UPDATE') {
      return this.installFromUri(request);
    }
    throw new ProtocolError(`WSMAN does not support mode ${request.mode}`, this.protocol, 'permanent');
  }

  private async installFromRepository(request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    const repo = request.repositoryUrl ?? request.additionalParams?.repository ?? 'ALL';
    const installOptions = `
      <p:InstallFromRepository_INPUT xmlns:p="${SOFTWARE_INSTALLATION_URI}">
        <p:Repository>${repo}</p:Repository>
        <p:InstallUpon>${request.installUpon ?? 'Immediate'}</p:InstallUpon>
      </p:InstallFromRepository_INPUT>`;
    const action = `${SOFTWARE_INSTALLATION_URI}/InstallFromRepository`;
    const { text } = await wsmanRequest(
      request.host,
      request.credentials,
      action,
      SOFTWARE_INSTALLATION_URI,
      installOptions
    );
    const jobId = parseXmlValue(text, 'JobID');
    return buildResult(this.protocol, jobId, text);
  }

  private async installFromUri(request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    const component = request.components[0];
    if (!component?.imageUri) {
      throw new ProtocolError('InstallFromURI requires imageUri', this.protocol, 'permanent');
    }
    const targets = Array.isArray(request.additionalParams?.targets)
      ? (request.additionalParams?.targets as string[]).map(target => `<p:Targets>${target}</p:Targets>`).join('')
      : '';
    const installOptions = `
      <p:InstallFromURI_INPUT xmlns:p="${SOFTWARE_INSTALLATION_URI}">
        <p:URI>${component.imageUri}</p:URI>
        ${targets}
      </p:InstallFromURI_INPUT>`;
    const action = `${SOFTWARE_INSTALLATION_URI}/InstallFromURI`;
    const { text } = await wsmanRequest(
      request.host,
      request.credentials,
      action,
      SOFTWARE_INSTALLATION_URI,
      installOptions
    );
    const jobId = parseXmlValue(text, 'JobID');
    return buildResult(this.protocol, jobId, text);
  }
}

function buildResult(protocol: string, jobId: string | undefined, raw: string): FirmwareUpdateResult {
  return {
    protocol: protocol as any,
    status: 'QUEUED',
    messages: [raw],
    jobId: jobId ?? null,
    taskLocation: null,
    startedAt: Date.now()
  };
}

function detectGeneration(info?: string) {
  if (!info) return 'UNKNOWN';
  if (/iDRAC7/i.test(info)) return '12G';
  if (/iDRAC8/i.test(info)) return '13G';
  if (/iDRAC9/i.test(info)) return '14G';
  if (/iDRAC10/i.test(info)) return '16G';
  return 'UNKNOWN';
}
