const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export interface PlanPayload {
  name: string;
  targets: string[];
  artifacts: Array<{ component: string; imageUri: string }>;
  policy?: Record<string, unknown>;
}

export async function createPlan(payload: PlanPayload) {
  const res = await fetch(`${BASE_URL}/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function discoverHost(id: string) {
  const res = await fetch(`${BASE_URL}/hosts/${id}/discover`, { method: 'POST' });
  return res.json();
}

export async function getPlanStatus(id: string) {
  const res = await fetch(`${BASE_URL}/plans/${id}/status`);
  return res.json();
}
