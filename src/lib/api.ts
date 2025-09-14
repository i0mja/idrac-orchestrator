const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const API_KEY = import.meta.env.VITE_API_KEY as string;

function authHeaders(contentType?: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${API_KEY}` };
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}

export interface PlanPayload {
  name: string;
  targets: string[];
  artifacts: Array<{ component: string; imageUri: string }>;
  policy?: Record<string, unknown>;
}

export async function createPlan(payload: PlanPayload) {
  const res = await fetch(`${BASE_URL}/plans`, {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function discoverHost(id: string) {
  const res = await fetch(`${BASE_URL}/hosts/${id}/discover`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return res.json();
}

export async function getPlanStatus(id: string) {
  const res = await fetch(`${BASE_URL}/plans/${id}/status`, {
    headers: authHeaders(),
  });
  return res.json();
}
