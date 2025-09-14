export interface SimpleUpdateInput {
  host: string; username: string; password: string;
  imageUri: string;
  transferProtocol?: 'HTTP'|'HTTPS'|'FTP';
  applyTime?: 'Immediate'|'OnReset';
  maintenanceWindowStart?: string;
  maintenanceWindowDurationSeconds?: number;
}

export async function simpleUpdate(input: SimpleUpdateInput) {
  const { host, username, password, imageUri, transferProtocol, applyTime, maintenanceWindowStart, maintenanceWindowDurationSeconds } = input;
  const payload: any = { ImageURI: imageUri };
  if (transferProtocol) payload.TransferProtocol = transferProtocol;
  if (applyTime) {
    payload['@Redfish.OperationApplyTime'] = applyTime;
    if (applyTime !== 'Immediate' && maintenanceWindowStart) {
      payload['@Redfish.MaintenanceWindow'] = {
        MaintenanceWindowStartTime: maintenanceWindowStart,
        MaintenanceWindowDurationInSeconds: maintenanceWindowDurationSeconds ?? 3600
      };
    }
  }
  const res = await fetch(`https://${host}/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64') },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`SimpleUpdate failed: ${res.status} ${await res.text()}`);
  const taskUri = res.headers.get('Location');
  return { taskUri };
}
