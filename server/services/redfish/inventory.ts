interface Auth { u: string; p: string; }

export async function getSoftwareInventory(host:string, auth:Auth) {
  const res = await fetch(`https://${host}/redfish/v1/UpdateService/SoftwareInventory`, {
    headers:{ 'Authorization': 'Basic ' + Buffer.from(`${auth.u}:${auth.p}`).toString('base64') }
  });
  if (!res.ok) throw new Error(`Inventory failed: ${res.status}`);
  return res.json();
}
