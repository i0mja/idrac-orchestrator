import { API_BASE_URL } from '@/lib/env';

const API_KEY = (import.meta.env.VITE_API_KEY as string | undefined) ?? '';

function authHeaders(contentType?: string) {
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export async function apiSend<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: authHeaders(body ? 'application/json' : undefined),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export interface PlanPayload {
  name: string;
  targets: string[];
  artifacts: Array<{ component: string; imageUri: string }>;
  policy?: Record<string, unknown>;
}

export async function createPlan(payload: PlanPayload) {
  const res = await fetch(`${API_BASE_URL}/plans`, {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function discoverHost(id: string) {
  const res = await fetch(`${API_BASE_URL}/hosts/${id}/discover`, {
    method: 'POST',
    headers: authHeaders()
  });
  return res.json();
}

export async function getPlanStatus(id: string) {
  const res = await fetch(`${API_BASE_URL}/plans/${id}/status`, {
    headers: authHeaders()
  });
  return res.json();
}

// OME connections
export async function createOmeConnection(input: {
  name: string;
  baseUrl: string;
  vaultPath: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE_URL}/ome/connections`, {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listOmeRuns(
  connectionId: string
): Promise<{ runs: any[]; cacheSummary: any }> {
  const res = await fetch(`${API_BASE_URL}/ome/${connectionId}/runs`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function omeDiscoverPreview(
  connectionId: string,
  filter?: string
): Promise<{ runId: string; total: number; stats: any; sample: any[] }> {
  const params = new URLSearchParams();
  if (filter) params.set('filter', filter);
  const res = await fetch(
    `${API_BASE_URL}/ome/${connectionId}/discover/preview?${params.toString()}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function omeDiscoverRun(
  connectionId: string,
  filter?: string
): Promise<{ runId: string; stats: any }> {
  const params = new URLSearchParams();
  if (filter) params.set('filter', filter);
  const res = await fetch(
    `${API_BASE_URL}/ome/${connectionId}/discover/run?${params.toString()}`,
    { method: 'POST', headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function omeSchedule(
  connectionId: string,
  everyMinutes: number,
  filter?: string
): Promise<{ scheduled: boolean; jobId: string }> {
  const res = await fetch(`${API_BASE_URL}/ome/${connectionId}/schedule`, {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify({ everyMinutes, filter })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function omeCancelSchedule(
  connectionId: string
): Promise<{ cancelled: boolean }> {
  const res = await fetch(`${API_BASE_URL}/ome/${connectionId}/schedule`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function omeResolveDevice(
  connectionId: string,
  hostId: string
): Promise<{ found: boolean; omeDeviceId?: number }> {
  const res = await fetch(
    `${API_BASE_URL}/ome/${connectionId}/resolve/${hostId}`,
    { method: 'POST', headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listHosts(): Promise<
  Array<{
    id: string;
    fqdn: string;
    mgmtIp: string;
    model?: string | null;
    serviceTag?: string | null;
    vcenterUrl?: string | null;
    clusterMoid?: string | null;
    hostMoid?: string | null;
    mgmtKind?: string | null;
    tags?: string[] | null;
  }>
> {
  const res = await fetch(`${API_BASE_URL}/hosts`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// vCenters
export interface VCenterPayload {
  name: string;
  hostname: string;
  username: string;
  password: string;
  port?: number;
  ignore_ssl?: boolean;
}

export const listVCenters = () => apiGet<any[]>('/vcenters');
export const createVCenter = (payload: VCenterPayload) =>
  apiSend<any>('/vcenters', 'POST', payload);
export const updateVCenter = (id: string, payload: VCenterPayload) =>
  apiSend<any>(`/vcenters/${id}`, 'PUT', payload);
export const deleteVCenter = (id: string) =>
  apiSend<{ deleted: boolean; id: string }>(`/vcenters/${id}`, 'DELETE');

// setup
export const getSetup = () => apiGet<any | null>('/system/setup');
export const putSetup = (cfg: any) => apiSend<{ ok: true }>(`/system/setup`, 'PUT', cfg);
