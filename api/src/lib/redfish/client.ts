export interface IdracCreds { username: string; password: string; }
const auth = (c: IdracCreds) => 'Basic ' + Buffer.from(`${c.username}:${c.password}`).toString('base64');

export async function simpleUpdate(idracHost: string, creds: IdracCreds, imageUri: string) {
  const url = `https://${idracHost}/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth(creds) },
    body: JSON.stringify({ ImageURI: imageUri, TransferProtocol: 'HTTP', Targets: [] })
  });
  if (!res.ok) throw new Error(`SimpleUpdate failed: ${res.status}`);
  const loc = res.headers.get('location') || '';
  const jobLocation = loc.startsWith('http') ? loc : `https://${idracHost}${loc}`;
  return { jobLocation };
}

export async function getJob(jobLocation: string, creds: IdracCreds) {
  const res = await fetch(jobLocation, { headers: { authorization: auth(creds) } });
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
  const res = await fetch(`https://${idracHost}/redfish/v1/UpdateService/SoftwareInventory`, {
    headers: { authorization: auth(creds) }
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
