import db from '../../db/index.js';
import { credentials } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

function parseEnvVaultPath(vaultPath: string) {
  // Formats supported:
  //  - "env:IDRAC_USER,IDRAC_PASS"
  //  - "env:VCENTER_USER,VCENTER_PASS"
  if (!vaultPath?.startsWith('env:')) return null;
  const parts = vaultPath.slice(4).split(',');
  const [userKey, passKey] = [parts[0], parts[1]];
  const username = userKey ? process.env[userKey] ?? '' : '';
  const password = passKey ? process.env[passKey] ?? '' : '';
  return { username, password };
}

export async function getIdracCreds(hostId: string): Promise<{ username: string; password: string }> {
  const rows = await db.select().from(credentials).where(eq(credentials.hostId, hostId));
  const row = rows.find(r => r.kind === 'idrac');
  const envCreds = row ? parseEnvVaultPath(row.vaultPath) : null;
  const username = envCreds?.username || process.env.IDRAC_USER || '';
  const password = envCreds?.password || process.env.IDRAC_PASS || '';
  if (!username || !password) throw new Error('Missing iDRAC credentials (set credentials row or env IDRAC_USER/IDRAC_PASS)');
  return { username, password };
}

export async function getVcenterCreds(hostId: string, fallback?: { url?: string }): Promise<{ baseUrl: string; username: string; password: string }> {
  const rows = await db.select().from(credentials).where(eq(credentials.hostId, hostId));
  const row = rows.find(r => r.kind === 'vcenter');
  const envCreds = row ? parseEnvVaultPath(row.vaultPath) : null;
  const baseUrl = fallback?.url || process.env.VCENTER_URL || '';
  const username = envCreds?.username || process.env.VCENTER_USERNAME || '';
  const password = envCreds?.password || process.env.VCENTER_PASSWORD || '';
  if (!baseUrl || !username || !password) throw new Error('Missing vCenter config (VCENTER_URL/USERNAME/PASSWORD or credentials row)');
  return { baseUrl, username, password };
}
