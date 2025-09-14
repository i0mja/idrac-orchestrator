export async function login(baseUrl: string, username: string, password: string) {
  const res = await fetch(`${baseUrl}/rest/com/vmware/cis/session`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
    },
  });
  if (!res.ok) throw new Error('login failed');
  const data: any = await res.json();
  return { token: data.value };
}

export function createClient(baseUrl: string, token: string) {
  const headers = { 'vmware-api-session-id': token };
  return {
    async enterMaintenance(hostMoid: string, opts: { evacuatePoweredOffVMs: boolean; timeoutMinutes: number }) {
      const res = await fetch(
        `${baseUrl}/rest/vcenter/host/maintenance-mode/${hostMoid}?action=enter`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            evacuatePoweredOffVms: opts.evacuatePoweredOffVMs,
            timeout: opts.timeoutMinutes,
          }),
        }
      );
      const json: any = await res.json();
      return { taskId: json.value?.task_id || json.value };
    },
    async exitMaintenance(hostMoid: string) {
      const res = await fetch(
        `${baseUrl}/rest/vcenter/host/maintenance-mode/${hostMoid}?action=exit`,
        { method: 'POST', headers }
      );
      const json: any = await res.json();
      return { taskId: json.value?.task_id || json.value };
    },
    async waitTask(taskId: string, timeoutMs = 300000, fetchImpl: typeof fetch = fetch): Promise<'success' | 'error'> {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const res = await fetchImpl(`${baseUrl}/rest/vcenter/task/${taskId}`, { headers });
        const data: any = await res.json();
        const state = data.value?.state || data.value?.status;
        if (state === 'SUCCEEDED' || state === 'success') return 'success';
        if (state === 'FAILED' || state === 'error') return 'error';
        await new Promise((r) => setTimeout(r, 1000));
      }
      return 'error';
    },
    async getHostConnectionState(hostMoid: string) {
      const res = await fetch(`${baseUrl}/rest/vcenter/host/${hostMoid}`, { headers });
      const data: any = await res.json();
      return data.value?.connection_state || 'UNKNOWN';
    },
  };
}
