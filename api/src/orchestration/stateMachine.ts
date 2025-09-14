import db from '../db/index.js';
import { artifacts, hostRuns, hosts, planTargets, updatePlans } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { detectCapabilities } from '../lib/detect.js';
import * as redfish from '../lib/redfish/client.js';
import * as vc from '../lib/vcenter/index.js';
import { getIdracCreds, getVcenterCreds } from '../lib/secrets/adapter.js';

type State = 'PRECHECKS'|'ENTER_MAINT'|'APPLY'|'REBOOT'|'POSTCHECKS'|'EXIT_MAINT'|'DONE'|'ERROR';

async function setState(id: string, from: State, to: State, patch: Record<string, unknown> = {}) {
  // optimistic: update only if in expected 'from' state
  const res = await db.execute<any>(sql.raw(`SELECT set_host_run_state('${id}', '${from}', '${to}', '${JSON.stringify(patch)}') AS ok;`));
  if (!Array.isArray(res) && 'rows' in res && res.rows?.[0]?.ok === false) {
    // fallback if driver returns rows differently
  }
}

export async function runStateMachine(hostRunId: string): Promise<State> {
  // 1) Load run, plan, host, artifacts
  const [run] = await db.select().from(hostRuns).where(eq(hostRuns.id, hostRunId));
  if (!run) throw new Error('host_run not found');

  const [host] = await db.select().from(hosts).where(eq(hosts.id, run.hostId));
  if (!host) throw new Error('host not found');

  const targets = await db.select().from(planTargets).where(eq(planTargets.planId, run.planId));
  const arts = await db.select().from(artifacts).where(eq(artifacts.planId, run.planId));
  const [plan] = await db.select().from(updatePlans).where(eq(updatePlans.id, run.planId));

  // === PRECHECKS ===
  await setState(hostRunId, 'PRECHECKS', 'PRECHECKS', { startedAt: Date.now() });
  const caps = await detectCapabilities({
    redfish: async () => {
      try { const r = await fetch(`https://${host.mgmtIp}/redfish/v1/`); return r.ok; } catch { return false; }
    },
    wsman: async () => false,
    racadm: async () => false
  });

  // Gather creds
  const idracCreds = await getIdracCreds(host.id);
  const vcenterRef = host.vcenterUrl ? await getVcenterCreds(host.id, { url: host.vcenterUrl || undefined }) : null;

  // === ENTER_MAINT ===
  if (host.vcenterUrl && host.hostMoid) {
    await setState(hostRunId, 'PRECHECKS', 'ENTER_MAINT', { mgmtKind: caps.mgmtKind });
    const { token } = await vc.login(vcenterRef!.baseUrl, vcenterRef!.username, vcenterRef!.password);
    const cli = vc.createClient(vcenterRef!.baseUrl, token);
    const { taskId } = await cli.enterMaintenance(host.hostMoid, { evacuatePoweredOffVMs: true, timeoutMinutes: Number(plan.policy?.maintenanceTimeoutMinutes ?? 120) });
    await cli.waitTask(taskId, 30 * 60_000);
  } else {
    await setState(hostRunId, 'PRECHECKS', 'APPLY', { mgmtKind: caps.mgmtKind });
  }

  // === APPLY (Redfish only for now) ===
  if (caps.features.redfish) {
    await setState(hostRunId, 'ENTER_MAINT', 'APPLY', {});
    for (const a of arts) {
      // one image per call
      const { jobLocation } = await redfish.simpleUpdate(host.mgmtIp, idracCreds, a.imageUri);
      await redfish.waitForJob(jobLocation, idracCreds, 30 * 60_000);
      // allow iDRAC to reboot the platform if needed; after each, wait for iDRAC reachable
      await redfish.waitForIdrac(host.mgmtIp, idracCreds, (plan.policy as any)?.idracReachabilityTimeoutSeconds ? (Number((plan.policy as any).idracReachabilityTimeoutSeconds) * 1000) : 10 * 60_000);
    }
  } else {
    await setState(hostRunId, 'ENTER_MAINT', 'ERROR', { reason: 'UNSUPPORTED_PROTOCOL', msg: 'WSMAN/RACADM path not implemented yet' });
    return 'ERROR';
  }

  // === POSTCHECKS ===
  await setState(hostRunId, 'APPLY', 'POSTCHECKS', {});
  try {
    const inv = await redfish.softwareInventory(host.mgmtIp, idracCreds);
    await setState(hostRunId, 'POSTCHECKS', 'POSTCHECKS', { inventory: inv });
  } catch {
    // ignore inventory read failures, continue
  }

  // === EXIT_MAINT ===
  if (host.vcenterUrl && host.hostMoid) {
    await setState(hostRunId, 'POSTCHECKS', 'EXIT_MAINT', {});
    const { token } = await vc.login(vcenterRef!.baseUrl, vcenterRef!.username, vcenterRef!.password);
    const cli = vc.createClient(vcenterRef!.baseUrl, token);
    const { taskId } = await cli.exitMaintenance(host.hostMoid);
    await cli.waitTask(taskId, 30 * 60_000);
  }

  await setState(hostRunId, 'EXIT_MAINT', 'DONE', { finishedAt: Date.now() });
  return 'DONE';
}
