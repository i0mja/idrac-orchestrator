export interface IdracCreds {
  username: string;
  password: string;
}

export async function simpleUpdate(idracHost: string, creds: IdracCreds, imageUri: string) {
  const res = await fetch(`https://${idracHost}/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64'),
    },
    body: JSON.stringify({ ImageURI: imageUri, TransferProtocol: 'HTTP', Targets: [] }),
  });
  if (!res.ok) {
    throw new Error('SimpleUpdate failed');
  }
  const jobLocation = res.headers.get('Location') || '';
  return { jobLocation };
}

export async function getJob(jobLocation: string, creds: IdracCreds) {
  const res = await fetch(jobLocation, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${creds.username}:${creds.password}`).toString('base64'),
    },
  });
  return (await res.json()) as any;
}

export async function waitForJob(jobLocation: string, creds: IdracCreds, timeoutMs = 300000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await getJob(jobLocation, creds);
    const state = job.TaskState || job.JobState;
    if (state === 'Completed') return job;
    if (state === 'Exception' || state === 'Failed') throw new Error('Job failed');
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for job');
}
