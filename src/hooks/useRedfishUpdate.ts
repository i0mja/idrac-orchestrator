import { api } from '@/integrations/api';

export interface SimpleUpdateInput {
  host: string; username: string; password: string;
  imageUri: string;
  transferProtocol?: 'HTTP'|'HTTPS'|'FTP';
  applyTime?: 'Immediate'|'OnReset';
  maintenanceWindowStart?: string;
  maintenanceWindowDurationSeconds?: number;
}

export function useRedfishUpdate() {
  const start = (input: SimpleUpdateInput, hostIds: string[]) =>
    api.post('/updates/redfish/simple', { input, hostIds });
  const status = (taskUri: string) =>
    api.get('/updates/redfish/task', { params: { taskUri } });
  return { start, status };
}
