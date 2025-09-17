import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import type { Readable } from 'node:stream';
import FormData from 'form-data';

export interface IdracCreds { username: string; password: string; }
export const authHeader = (c: IdracCreds) => 'Basic ' + Buffer.from(`${c.username}:${c.password}`).toString('base64');

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

type RedfishRequestInit = RequestInit & { agent?: https.Agent };

export function redfishFetch(input: string | URL, init: RequestInit = {}) {
  const opts: RedfishRequestInit = { ...init, agent: getIdracAgent() };
  return fetch(input, opts as RequestInit);
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

export async function simpleUpdate(idracHost: string, creds: IdracCreds, imageUri: string, targets?: string[]) {
  const baseUrl = normalizeBaseUrl(idracHost);
  const url = `${baseUrl}/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate`;
  const proto = imageUri.startsWith('https://') ? 'HTTPS' : 'HTTP';
  const payload: Record<string, unknown> = { ImageURI: imageUri, TransferProtocol: proto };
  if (targets?.length) payload.Targets = targets;

  const res = await redfishFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: authHeader(creds) },
    body: JSON.stringify(payload)
  });
  const body = await readResponseBody(res);
  if (res.status >= 400) throw new RedfishError('SimpleUpdate failed', res.status, body);
  const taskLocation = resolveLocation(baseUrl, res.headers.get('location'));
  return { status: res.status, body, taskLocation, jobLocation: taskLocation };
}

interface InstallFromRepositoryOptions {
  installUpon?: 'Immediate' | 'OnReset';
  updateParameters?: Record<string, unknown>;
}

export async function installFromRepository(
  idracHost: string,
  creds: IdracCreds,
  repoUrl?: string,
  options: InstallFromRepositoryOptions = {}
) {
  const baseUrl = normalizeBaseUrl(idracHost);
  const serviceUrl = `${baseUrl}/redfish/v1/UpdateService`;
  const serviceRes = await redfishFetch(serviceUrl, { headers: { authorization: authHeader(creds) } });
  if (!serviceRes.ok) {
    const body = await readResponseBody(serviceRes);
    throw new RedfishError('Failed to query UpdateService', serviceRes.status, body);
  }
  const service = await serviceRes.json() as any;
  const actionKey = '#UpdateService.InstallFromRepository';
  if (!service?.Actions?.[actionKey]) {
    throw new RedfishActionMissingError(actionKey);
  }

  const payload = {
    Repository: repoUrl ?? DEFAULT_DELL_CATALOG_URL,
    InstallUpon: options.installUpon ?? 'Immediate',
    UpdateParameters: options.updateParameters ?? {}
  };

  const actionUrl = `${serviceUrl}/Actions/UpdateService.InstallFromRepository`;
  const res = await redfishFetch(actionUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: authHeader(creds) },
    body: JSON.stringify(payload)
  });
  const body = await readResponseBody(res);
  if (res.status >= 400) {
    throw new RedfishError('InstallFromRepository failed', res.status, body);
  }
  const taskLocation = resolveLocation(baseUrl, res.headers.get('location'));
  return { status: res.status, body, taskLocation, jobLocation: taskLocation };
}

export interface MultipartUpdateInput {
  fileName: string;
  fileStream: Readable;
  size?: number;
  updateParameters?: Record<string, unknown>;
}

async function computeFormLength(form: FormData): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err) {
        if ('code' in (err as NodeJS.ErrnoException) && (err as NodeJS.ErrnoException).code === 'ERR_STREAM_PREMATURE_CLOSE') {
          resolve(undefined);
        } else {
          reject(err);
        }
      } else {
        resolve(length);
      }
    });
  }).catch(() => undefined);
}

export async function multipartUpdate(idracHost: string, creds: IdracCreds, input: MultipartUpdateInput) {
  const baseUrl = normalizeBaseUrl(idracHost);
  const url = `${baseUrl}/redfish/v1/UpdateService/update-multipart`;
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
    ...form.getHeaders(),
    authorization: authHeader(creds)
  };

  let length = typeof input.size === 'number' ? input.size : undefined;
  if (length == null) {
    length = await computeFormLength(form);
  }
  if (typeof length === 'number' && Number.isFinite(length)) {
    headers['Content-Length'] = String(length);
  }

  const res = await redfishFetch(url, {
    method: 'POST',
    headers,
    body: form as unknown as BodyInit
  });
  const body = await readResponseBody(res);
  if (res.status >= 400) {
    throw new RedfishError('Multipart update failed', res.status, body);
  }
  const taskLocation = resolveLocation(baseUrl, res.headers.get('location'));
  return { status: res.status, body, taskLocation, jobLocation: taskLocation };
}

export async function getJob(jobLocation: string, creds: IdracCreds) {
  const res = await redfishFetch(jobLocation, { headers: { authorization: authHeader(creds) } });
  if (!res.ok) throw new Error(`getJob failed: ${res.status}`);
  return res.json();
}

export async function waitForJob(jobLocation: string, creds: IdracCreds, timeoutMs = 15 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const j = await getJob(jobLocation, creds);
    const state = j.TaskState || j.JobState || j.Status || '';
    if (state === 'Completed') return j;
    if (/(Exception|Failed|Error)/i.test(state)) throw new Error(`Job failed: ${state}`);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for Redfish job');
}

export async function softwareInventory(idracHost: string, creds: IdracCreds) {
  const baseUrl = normalizeBaseUrl(idracHost);
  const res = await redfishFetch(`${baseUrl}/redfish/v1/UpdateService/SoftwareInventory`, {
    headers: { authorization: authHeader(creds) }
  });
  if (!res.ok) throw new Error(`SoftwareInventory failed: ${res.status}`);
  return res.json();
}

export async function waitForIdrac(idracHost: string, creds: IdracCreds, timeoutMs = 10 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await softwareInventory(idracHost, creds); return true; }
    catch { await new Promise(r => setTimeout(r, 5000)); }
  }
  throw new Error('iDRAC not responding within timeout');
}
