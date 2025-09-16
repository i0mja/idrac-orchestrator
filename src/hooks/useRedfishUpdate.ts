import { apiSend } from '@/lib/api';

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
    apiSend('/updates/redfish/simple', 'POST', { input, hostIds });
  const status = (taskUri: string) =>
    apiSend('/updates/redfish/task', 'GET', { taskUri });
  return { start, status };
}
