export async function pollTask(host: string, taskUri: string, auth: {u:string;p:string}) {
  while (true) {
    const res = await fetch(`https://${host}${taskUri}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${auth.u}:${auth.p}`).toString('base64')
      }
    });
    if (!res.ok) throw new Error(`Task poll failed: ${res.status}`);
    const data = await res.json();
    if (['Completed','Exception','Killed'].includes(data.TaskState)) {
      return data;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}
