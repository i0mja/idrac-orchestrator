export async function login(baseUrl: string, username: string, password: string) {
  const res = await fetch(`${baseUrl}/rest/com/vmware/cis/session`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64') }
  });
  if (!res.ok) throw new Error('vCenter login failed');
  const data: any = await res.json();
  return { token: data.value };
}

export function createClient(baseUrl: string, token: string) {
  const headers = { 'vmware-api-session-id': token };

  return {
    async enterMaintenance(hostMoid: string, opts: { evacuatePoweredOffVMs: boolean; timeoutMinutes: number }) {
      const url = `${baseUrl}/rest/vcenter/host/maintenance-mode/${hostMoid}?action=enter`;
      const body = { evacuate_all: true, timeout: Math.max(60, (opts.timeoutMinutes ?? 60) * 60) };
      const res = await fetch(url, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('enterMaintenance failed');
      const data: any = await res.json();
      return { taskId: data?.value ?? '' };
    },

    async exitMaintenance(hostMoid: string) {
      const url = `${baseUrl}/rest/vcenter/host/maintenance-mode/${hostMoid}?action=exit`;
      const res = await fetch(url, { method: 'POST', headers });
      if (!res.ok) throw new Error('exitMaintenance failed');
      const data: any = await res.json();
      return { taskId: data?.value ?? '' };
    },

    async waitTask(taskId: string, timeoutMs: number, fetchImpl?: (url: string, init?: any) => Promise<any>) {
      const f = fetchImpl ?? ((u: string, i?: any) => fetch(u, i));
      const deadline = Date.now() + timeoutMs;
      const url = `${baseUrl}/rest/com/vmware/cis/task/${encodeURIComponent(taskId)}`;
      while (Date.now() < deadline) {
        const res = await f(url, { headers });
        if (!res.ok) throw new Error('waitTask failed');
        const data: any = await res.json();
        const state = data?.value?.state || data?.value?.status;
        if (state === 'SUCCEEDED' || state === 'success') return 'success';
        if (state === 'FAILED' || state === 'error') return 'error';
        await new Promise(r => setTimeout(r, 1000));
      }
      return 'error';
    },

    async getHostConnectionState(hostMoid: string) {
      const res = await fetch(`${baseUrl}/rest/vcenter/host/${hostMoid}`, { headers });
      if (!res.ok) throw new Error('getHostConnectionState failed');
      const data: any = await res.json();
      return data?.value?.connection_state || 'UNKNOWN';
    }
  };
}
