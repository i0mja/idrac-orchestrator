import EventEmitter from 'node:events';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import FormData from 'form-data';
import { classifyError, OrchestrationError, ProtocolError, TimeoutError } from '../errors.js';
import { exponentialBackoff } from '../utils/time.js';
import { withRetry } from '../utils/retry.js';
import { isAbortError } from '../utils/errorGuards.js';

export interface IdracCreds { username: string; password: string; }
export type ApplyTime = 'Immediate' | 'OnReset' | 'AtMaintenanceWindowStart';

export const insecureAgent = new https.Agent({ rejectUnauthorized: false });

let cachedAgent: https.Agent | null = null;
let cachedKey: string | null = null;

function loadCaBundle(value: string): string {
  if (value.includes('-----BEGIN')) return value;
  const filePath = path.resolve(value);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read IDRAC_CA_PEM at ${filePath}: ${message}`);
  }
}

export function getIdracAgent(): https.Agent {
  const caSetting = process.env.IDRAC_CA_PEM ?? '';
  const key = caSetting || '__insecure__';
  if (cachedAgent && cachedKey === key) return cachedAgent;

  if (!caSetting.trim()) {
    cachedAgent = insecureAgent;
    cachedKey = key;
    return cachedAgent;
  }

  const ca = loadCaBundle(caSetting.trim());
  cachedAgent = new https.Agent({ ca, rejectUnauthorized: true });
  cachedKey = key;
  return cachedAgent;
}

type RedfishRequestInit = RequestInit & { agent?: https.Agent; timeoutMs?: number };

type FetchImpl = (input: string | URL, init?: RedfishRequestInit) => Promise<Response>;

export interface RedfishClientEvent {
  type: 'request' | 'response' | 'error' | 'session-created' | 'session-deleted';
  method?: string;
  url?: string;
  status?: number;
  durationMs?: number;
  error?: unknown;
}

export interface MaintenanceWindow {
  start?: string;
  durationSeconds?: number;
}

export interface SimpleUpdateOptions {
  imageUri: string;
  transferProtocol?: 'HTTP' | 'HTTPS' | 'NFS' | 'SCP' | 'FTP';
  applyTime?: ApplyTime;
  maintenanceWindow?: MaintenanceWindow;
  targets?: string[];
  retries?: number;
}

export interface InstallFromRepositoryOptions {
  repository?: string;
  installUpon?: 'Immediate' | 'OnReset';
  updateParameters?: Record<string, unknown>;
  retries?: number;
}

export interface MultipartUpdateInput {
  fileName: string;
  fileStream: Readable;
  size?: number;
  updateParameters?: Record<string, unknown>;
  retries?: number;
}

export interface EventSubscriptionRequest {
  destination: string;
  context?: string;
  protocol?: 'Redfish' | 'SNMP';
  eventTypes?: string[];
  heartbeatIntervalSeconds?: number;
}

export interface SecureBootUpdateOptions {
  enable?: boolean;
  mode?: 'UserMode' | 'SetupMode';
}

export interface AttestationReport {
  secureBootEnabled?: boolean;
  lastAttested?: string;
  firmwareVersion?: string;
  measurements?: Array<{ component: string; status: string; message?: string }>;
}

export interface RedfishClientOptions {
  baseUrl: string;
  credentials: IdracCreds;
  fetchImpl?: FetchImpl;
  agent?: https.Agent;
  logger?: (event: RedfishClientEvent) => void | Promise<void>;
  defaultTimeoutMs?: number;
}

export const DEFAULT_DELL_CATALOG_URL = process.env.DELL_CATALOG_URL ?? 'https://downloads.dell.com/catalog/Catalog.xml.gz';

export class RedfishError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(`${message} (status ${status})`);
    this.name = 'RedfishError';
  }
}

export class RedfishActionMissingError extends RedfishError {
  constructor(public action: string) {
    super(`Redfish action ${action} not supported`, 400, null);
    this.name = 'RedfishActionMissingError';
  }
}

export function normalizeBaseUrl(idracHost: string) {
  const trimmed = idracHost.replace(/\s+/g, '').replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const authHeader = (c: IdracCreds) => 'Basic ' + Buffer.from(`${c.username}:${c.password}`).toString('base64');

export async function readResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function resolveLocation(baseUrl: string, raw: string | null): string | null {
  if (!raw) return null;
  try {
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

export function redfishFetch(input: string | URL, init: RedfishRequestInit = {}) {
  const opts: RedfishRequestInit = { ...init, agent: init.agent ?? getIdracAgent() };
  return fetch(input, opts as RequestInit);
}

function resolveTimeout(init?: RedfishRequestInit, fallback?: number) {
  if (init?.timeoutMs && Number.isFinite(init.timeoutMs)) {
    return init.timeoutMs;
  }
  if (init?.signal && typeof (init.signal as any).timeout === 'function') {
    return undefined;
  }
  return fallback;
}

function createAbortSignal(timeoutMs?: number): AbortController | undefined {
  if (!timeoutMs) return undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener('abort', () => clearTimeout(timer));
  return controller;
}

export class RedfishClient extends EventEmitter {
  private readonly baseUrl: string;
  private readonly creds: IdracCreds;
  private readonly fetchImpl: FetchImpl;
  private readonly logger?: RedfishClientOptions['logger'];
  private readonly defaultTimeoutMs: number;
  private sessionToken?: string;
  private sessionLocation?: string;
  private sessionExpiry?: number;

  constructor(options: RedfishClientOptions) {
    super();
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.creds = options.credentials;
    this.fetchImpl = options.fetchImpl ?? ((input, init = {}) => redfishFetch(input, { ...init, agent: options.agent }));
    this.logger = options.logger;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
  }

  async destroy() {
    if (this.sessionToken && this.sessionLocation) {
      try {
        await this.fetchImpl(this.sessionLocation, {
          method: 'DELETE',
          headers: { 'x-auth-token': this.sessionToken },
          timeoutMs: 5000
        });
        this.emitEvent({ type: 'session-deleted' });
      } catch {
        // ignore
      }
    }
    this.sessionToken = undefined;
    this.sessionLocation = undefined;
    this.sessionExpiry = undefined;
  }

  private async request(path: string, init: RedfishRequestInit = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const timeoutMs = resolveTimeout(init, this.defaultTimeoutMs);
    const abort = createAbortSignal(timeoutMs);
    const start = Date.now();
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> ?? {}),
      Accept: 'application/json'
    };
    if (this.sessionToken) {
      headers['X-Auth-Token'] = this.sessionToken;
    } else {
      headers.authorization = authHeader(this.creds);
    }
    this.emitEvent({ type: 'request', method: init.method ?? 'GET', url });
    try {
      const res = await this.fetchImpl(url, { ...init, headers, signal: abort?.signal, timeoutMs });
      this.emitEvent({ type: 'response', method: init.method ?? 'GET', url, status: res.status, durationMs: Date.now() - start });
      if (res.status === 401 && !headers.authorization) {
        await this.destroy();
        throw new ProtocolError('Session expired or unauthorized', 'REDFISH', 'permanent', {
          host: this.baseUrl,
          operation: 'request'
        });
      }
      return res;
    } catch (error) {
      if (isAbortError(error)) {
        throw new TimeoutError(`Redfish request to ${url} timed out`, 'REDFISH', { host: this.baseUrl }, error);
      }
      this.emitEvent({ type: 'error', method: init.method ?? 'GET', url, error });
      throw error;
    }
  }

  private emitEvent(event: RedfishClientEvent) {
    this.logger?.(event);
    this.emit(event.type, event);
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionToken && this.sessionExpiry && Date.now() < this.sessionExpiry - 60_000) {
      return;
    }
    const sessionUrl = `${this.baseUrl}/redfish/v1/SessionService/Sessions`;
    const res = await this.fetchImpl(sessionUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: authHeader(this.creds)
      },
      body: JSON.stringify({ UserName: this.creds.username, Password: this.creds.password }),
      timeoutMs: 10_000
    });

    if (!res.ok) {
      const body = await readResponseBody(res);
      if (res.status === 404 || res.status === 501) {
        // Session service not available (older iDRAC)
        this.sessionToken = undefined;
        this.sessionLocation = undefined;
        this.sessionExpiry = undefined;
        return;
      }
      throw new RedfishError('Session creation failed', res.status, body);
    }

    const token = res.headers.get('x-auth-token');
    const location = res.headers.get('location');
    this.sessionToken = token ?? undefined;
    this.sessionLocation = location ? resolveLocation(this.baseUrl, location) ?? undefined : undefined;
    this.sessionExpiry = Date.now() + 30 * 60_000; // default to 30 minutes
    this.emitEvent({ type: 'session-created' });
  }

  async serviceRoot() {
    const res = await this.request('/redfish/v1/');
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw new RedfishError('Failed to fetch ServiceRoot', res.status, body);
    }
    return res.json();
  }

  async enumerateCapabilities() {
    const root = await this.serviceRoot();
    const updateLink = root?.UpdateService?.['@odata.id'] ?? '/redfish/v1/UpdateService';
    const managerLink = root?.Managers?.['@odata.id'] ?? '/redfish/v1/Managers';
    const updateService = await this.get(updateLink);
    const managerCollection = await this.get(managerLink);
    const members = Array.isArray(managerCollection?.Members) ? managerCollection.Members : [];
    let firmwareVersion: string | undefined;
    for (const member of members) {
      const id = typeof member === 'string' ? member : member?.['@odata.id'];
      if (!id) continue;
      const manager = await this.get(id);
      firmwareVersion = manager?.FirmwareVersion ?? firmwareVersion;
    }
    const actions = Object.keys(updateService?.Actions ?? {});
    return {
      firmwareVersion,
      actions,
      simpleUpdate: actions.some(action => /SimpleUpdate/i.test(action)),
      installFromRepository: actions.some(action => /InstallFromRepository/i.test(action)),
      multipart: actions.some(action => /Multipart/i.test(action)),
      raw: { updateService }
    };
  }

  async get(path: string) {
    const res = await this.request(path);
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw new RedfishError(`GET ${path} failed`, res.status, body);
    }
    return res.json();
  }

  async simpleUpdate(options: SimpleUpdateOptions) {
    await this.ensureSession();
    const payload: Record<string, unknown> = {
      ImageURI: options.imageUri,
      TransferProtocol: options.transferProtocol ?? (options.imageUri.startsWith('https://') ? 'HTTPS' : 'HTTP')
    };
    if (options.targets?.length) payload.Targets = options.targets;
    if (options.applyTime) {
      payload['@Redfish.OperationApplyTime'] = options.applyTime;
      if (options.applyTime !== 'Immediate' && options.maintenanceWindow) {
        payload['@Redfish.MaintenanceWindow'] = {
          MaintenanceWindowStartTime: options.maintenanceWindow.start,
          MaintenanceWindowDurationInSeconds: options.maintenanceWindow.durationSeconds ?? 3600
        };
      }
    }

    const actionUrl = `/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate`;
    const res = await withRetry(() => this.request(actionUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }), { maxAttempts: options.retries ?? 3 });

    if (!res.ok) {
      const body = await readResponseBody(res);
      throw new RedfishError('SimpleUpdate failed', res.status, body);
    }
    const taskLocation = resolveLocation(this.baseUrl, res.headers.get('location'));
    return { status: res.status, body: await readResponseBody(res), taskLocation, jobLocation: taskLocation };
  }

  async installFromRepository(options: InstallFromRepositoryOptions = {}) {
    await this.ensureSession();
    const serviceUrl = `/redfish/v1/UpdateService`;
    const service = await this.get(serviceUrl);
    const actionKey = Object.keys(service?.Actions ?? {}).find(key => /InstallFromRepository/i.test(key));
    if (!actionKey) {
      throw new RedfishActionMissingError('#UpdateService.InstallFromRepository');
    }
    const payload = {
      Repository: options.repository ?? DEFAULT_DELL_CATALOG_URL,
      InstallUpon: options.installUpon ?? 'Immediate',
      UpdateParameters: options.updateParameters ?? {}
    };
    const res = await withRetry(() => this.request(`${serviceUrl}/Actions/UpdateService.InstallFromRepository`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }), { maxAttempts: options.retries ?? 3 });
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw new RedfishError('InstallFromRepository failed', res.status, body);
    }
    const taskLocation = resolveLocation(this.baseUrl, res.headers.get('location'));
    return { status: res.status, body: await readResponseBody(res), taskLocation, jobLocation: taskLocation };
  }

  async multipartUpdate(input: MultipartUpdateInput) {
    await this.ensureSession();
    const url = `/redfish/v1/UpdateService/update-multipart`;
    const form = new FormData();
    form.append('UpdateParameters', JSON.stringify(input.updateParameters ?? {}), {
      contentType: 'application/json'
    });
    form.append('UpdateFile', input.fileStream, {
      filename: input.fileName,
      contentType: 'application/octet-stream',
      knownLength: input.size
    });

    const headers: Record<string, string> = {
      ...form.getHeaders()
    };

    const res = await withRetry(() => this.request(url, {
      method: 'POST',
      headers,
      body: form as unknown as BodyInit
    }), { maxAttempts: input.retries ?? 3 });
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw new RedfishError('Multipart update failed', res.status, body);
    }
    const taskLocation = resolveLocation(this.baseUrl, res.headers.get('location'));
    return { status: res.status, body: await readResponseBody(res), taskLocation, jobLocation: taskLocation };
  }

  async createEventSubscription(request: EventSubscriptionRequest) {
    await this.ensureSession();
    const payload = {
      Destination: request.destination,
      Context: request.context,
      Protocol: request.protocol ?? 'Redfish',
      EventTypes: request.eventTypes ?? ['StatusChange', 'ResourceUpdated', 'ResourceAdded', 'ResourceRemoved'],
      HttpHeaders: [{ Key: 'Authorization', Value: authHeader(this.creds) }],
      Oem: {
        Dell: {
          HeartbeatIntervalSeconds: request.heartbeatIntervalSeconds ?? 300
        }
      }
    };
    const res = await this.request('/redfish/v1/EventService/Subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw new RedfishError('Failed to create event subscription', res.status, body);
    }
    return {
      status: res.status,
      location: resolveLocation(this.baseUrl, res.headers.get('location')),
      body: await readResponseBody(res)
    };
  }

  async listEventSubscriptions() {
    const res = await this.request('/redfish/v1/EventService/Subscriptions');
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw new RedfishError('Failed to list subscriptions', res.status, body);
    }
    return res.json();
  }

  async deleteEventSubscription(subscriptionLocation: string) {
    const res = await this.request(subscriptionLocation.startsWith('http') ? subscriptionLocation : subscriptionLocation, {
      method: 'DELETE'
    });
    if (!res.ok && res.status !== 404) {
      const body = await readResponseBody(res);
      throw new RedfishError('Failed to delete event subscription', res.status, body);
    }
    return true;
  }

  async secureBoot(options: SecureBootUpdateOptions) {
    const serviceRoot = await this.serviceRoot();
    const systemLink = serviceRoot?.Systems?.['@odata.id'];
    if (!systemLink) {
      throw new RedfishError('SecureBoot not supported', 404, null);
    }
    const systems = await this.get(systemLink);
    const members = Array.isArray(systems?.Members) ? systems.Members : [];
    for (const member of members) {
      const uri = typeof member === 'string' ? member : member?.['@odata.id'];
      if (!uri) continue;
      const secureBoot = await this.get(`${uri}/SecureBoot`).catch(() => undefined);
      if (!secureBoot) continue;
      const payload: Record<string, unknown> = {};
      if (typeof options.enable === 'boolean') payload.SecureBootEnable = options.enable;
      if (options.mode) payload.SecureBootMode = options.mode;
      if (Object.keys(payload).length === 0) {
        return secureBoot;
      }
      const res = await this.request(`${uri}/SecureBoot`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await readResponseBody(res);
        throw new RedfishError('Failed to update SecureBoot settings', res.status, body);
      }
      return res.json();
    }
    throw new RedfishError('SecureBoot resource not found', 404, null);
  }

  async attestationReport(): Promise<AttestationReport> {
    const serviceRoot = await this.serviceRoot();
    const attestationUri = serviceRoot?.Oem?.Dell?.['@odata.id'] ?? '/redfish/v1/Dell/AttestationService';
    const res = await this.request(attestationUri);
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw new RedfishError('Failed to retrieve attestation report', res.status, body);
    }
    const payload = await res.json();
    const measurements = Array.isArray(payload?.Measurements)
      ? payload.Measurements.map((m: any) => ({
          component: m.Component ?? m.Name ?? 'Unknown',
          status: m.Status ?? m.Result ?? 'Unknown',
          message: m.Message ?? m.Resolution
        }))
      : [];
    return {
      secureBootEnabled: payload?.SecureBootEnabled,
      lastAttested: payload?.LastAttested,
      firmwareVersion: payload?.FirmwareVersion,
      measurements
    };
  }

  async waitForIdrac(timeoutMs = 10 * 60_000) {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;
    while (Date.now() < deadline) {
      try {
        const res = await this.request('/redfish/v1/');
        if (res.ok) return true;
      } catch (error) {
        if (!isRetryableError(error)) {
          throw error;
        }
      }
      const delay = Math.min(15_000, exponentialBackoff(attempt++, 1000, 15_000));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new TimeoutError('iDRAC did not recover within timeout', 'REDFISH');
  }
}

function isRetryableError(error: unknown) {
  if (error instanceof ProtocolError) {
    return error.classification === 'transient';
  }
  if (error instanceof RedfishError) {
    return error.status >= 500 || error.status === 404;
  }
  if (error && typeof error === 'object') {
    const code = (error as NodeJS.ErrnoException).code;
    return typeof code === 'string' && ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(code);
  }
  if (error instanceof Error) {
    return /(network|timeout|reset|socket)/i.test(error.message);
  }
  return false;
}

export async function simpleUpdate(
  idracHost: string,
  creds: IdracCreds,
  imageUri: string,
  targets?: string[],
  options: Partial<SimpleUpdateOptions> = {}
) {
  const client = new RedfishClient({ baseUrl: normalizeBaseUrl(idracHost), credentials: creds });
  try {
    return await client.simpleUpdate({ imageUri, targets, ...options });
  } finally {
    await client.destroy();
  }
}

export async function installFromRepository(
  idracHost: string,
  creds: IdracCreds,
  repoUrl?: string,
  options: InstallFromRepositoryOptions = {}
) {
  const client = new RedfishClient({ baseUrl: normalizeBaseUrl(idracHost), credentials: creds });
  try {
    return await client.installFromRepository({ ...options, repository: repoUrl ?? options.repository });
  } finally {
    await client.destroy();
  }
}

export async function multipartUpdate(
  idracHost: string,
  creds: IdracCreds,
  input: MultipartUpdateInput
) {
  const client = new RedfishClient({ baseUrl: normalizeBaseUrl(idracHost), credentials: creds });
  try {
    return await client.multipartUpdate(input);
  } finally {
    await client.destroy();
  }
}

export async function waitForIdrac(idracHost: string, creds: IdracCreds, timeoutMs = 10 * 60_000) {
  const client = new RedfishClient({ baseUrl: normalizeBaseUrl(idracHost), credentials: creds });
  try {
    return await client.waitForIdrac(timeoutMs);
  } finally {
    await client.destroy();
  }
}

export async function fetchAttestation(idracHost: string, creds: IdracCreds) {
  const client = new RedfishClient({ baseUrl: normalizeBaseUrl(idracHost), credentials: creds });
  try {
    return await client.attestationReport();
  } finally {
    await client.destroy();
  }
}

export async function ensureSecureBoot(
  idracHost: string,
  creds: IdracCreds,
  options: SecureBootUpdateOptions
) {
  const client = new RedfishClient({ baseUrl: normalizeBaseUrl(idracHost), credentials: creds });
  try {
    return await client.secureBoot(options);
  } finally {
    await client.destroy();
  }
}

export async function openFirmwareStream(imageUri: string): Promise<{ stream: Readable; size?: number; fileName: string }> {
  if (/^https?:\/\//i.test(imageUri)) {
    const response = await fetch(imageUri);
    if (!response.ok || !response.body) {
      throw new OrchestrationError(`Failed to download firmware image ${imageUri}`, classifyError(response), {
        host: imageUri,
        operation: 'download'
      });
    }
    const sizeHeader = response.headers.get('content-length');
    const size = sizeHeader ? Number(sizeHeader) : undefined;
    const fileName = imageUri.split('/').filter(Boolean).pop() ?? 'firmware.pkg';
    const nodeStream = Readable.fromWeb(response.body as unknown as ReadableStream);
    return { stream: nodeStream, size: Number.isFinite(size) ? size : undefined, fileName };
  }

  if (imageUri.startsWith('file://')) {
    const filePath = fileURLToPath(new URL(imageUri));
    const stats = await fs.promises.stat(filePath);
    return { stream: fs.createReadStream(filePath), size: stats.size, fileName: path.basename(filePath) };
  }

  const resolved = path.resolve(imageUri);
  const stats = await fs.promises.stat(resolved);
  return { stream: fs.createReadStream(resolved), size: stats.size, fileName: path.basename(resolved) };
}
