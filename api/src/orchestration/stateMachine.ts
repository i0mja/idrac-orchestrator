import db from '../db/index.js';
import { artifacts, hostRuns, hosts, updatePlans } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import * as redfish from '../lib/redfish/client.js';
import { collectSoftwareInventory, diffInventories, pollTask, type TaskLogEvent } from '../lib/redfish/taskService.js';
import * as vc from '../lib/vcenter/index.js';
import { getIdracCreds, getVcenterCreds } from '../lib/secrets/adapter.js';
import { createDefaultProtocolManager } from '../lib/protocols/index.js';
import type { FirmwareUpdateRequest, ProtocolCapability } from '../lib/protocols/types.js';
import { buildFirmwarePlan } from '../lib/firmware/repository.js';
import { ensureSecureBoot, fetchAttestation, openFirmwareStream } from '../lib/redfish/client.js';
import { classifyError, OrchestrationError, ProtocolError, toOrchestrationError } from '../lib/errors.js';

export type UpdateMode = 'LATEST_FROM_CATALOG' | 'SPECIFIC_URL' | 'MULTIPART_FILE';

type State =
  | 'PRECHECKS'
  | 'PRE_DOWNLOAD'
  | 'STAGING'
  | 'VALIDATION'
  | 'BACKUP_CONFIG'
  | 'ENTER_MAINT'
  | 'APPLY'
  | 'REBOOT'
  | 'POSTCHECKS'
  | 'POST_VALIDATION'
  | 'ROLLBACK'
  | 'EXIT_MAINT'
  | 'DONE'
  | 'ERROR';

const DEFAULT_TIMEOUT_MINUTES = Number(process.env.IDRAC_UPDATE_TIMEOUT_MIN ?? '90');

async function setState(id: string, from: State, to: State, ctx: Record<string, unknown> = {}) {
  // Use parameterized query to prevent SQL injection
  await db.execute(sql`SELECT set_host_run_state(${id}, ${from}, ${to}, ${JSON.stringify(ctx)}) AS ok;`);
}

function resolveCatalogUrl(policy: Record<string, unknown>): string {
  const catalog = typeof policy.catalogUrl === 'string' && policy.catalogUrl.trim().length ? policy.catalogUrl.trim() : undefined;
  return catalog ?? redfish.DEFAULT_DELL_CATALOG_URL;
}

function assertUpdateMode(value: unknown): UpdateMode {
  if (value === 'LATEST_FROM_CATALOG' || value === 'SPECIFIC_URL' || value === 'MULTIPART_FILE') return value;
  return 'SPECIFIC_URL';
}

function sanitizeTargets(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const targets = value.filter(v => typeof v === 'string' && v.trim().length > 0) as string[];
  return targets.length ? targets : undefined;
}

interface ProgressState {
  phase: string;
  component?: string;
  taskLocation?: string | null;
  message?: string;
  event?: TaskLogEvent;
  fallback?: 'RACADM';
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;
  const pool = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) break;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(pool);
  return results;
}

export async function runStateMachine(hostRunId: string): Promise<State> {
  const [run] = await db.select().from(hostRuns).where(eq(hostRuns.id, hostRunId));
  if (!run) throw new Error('host_run not found');

  const [host] = await db.select().from(hosts).where(eq(hosts.id, run.hostId));
  if (!host) throw new Error('host not found');

  const artifactsRows = await db.select().from(artifacts).where(eq(artifacts.planId, run.planId));
  const [plan] = await db.select().from(updatePlans).where(eq(updatePlans.id, run.planId));

  const policy = (plan?.policy ?? {}) as Record<string, unknown>;
  const updateMode = assertUpdateMode(policy.updateMode);
  const repoUrl = resolveCatalogUrl(policy);
  const targets = sanitizeTargets(policy.targets);

  const idracCreds = await getIdracCreds(host.id);
  const idracBaseUrl = redfish.normalizeBaseUrl(host.mgmtIp);
  const timeoutMinutes = DEFAULT_TIMEOUT_MINUTES;

  let ctx: Record<string, unknown> = (run.ctx as Record<string, unknown>) ?? {};
  let currentState: State = run.state as State;

  const mergeCtx = (patch: Record<string, unknown>) => {
    ctx = { ...ctx, ...patch };
    return ctx;
  };

  const updateCtx = async (patch: Record<string, unknown>) => {
    const next = mergeCtx(patch);
    await setState(hostRunId, currentState, currentState, next);
  };

  const transition = async (to: State, patch: Record<string, unknown> = {}) => {
    const next = mergeCtx(patch);
    await setState(hostRunId, currentState, to, next);
    currentState = to;
  };

  await updateCtx({ startedAt: Date.now(), updateMode, repoUrl, targets });

  const protocolEvents: any[] = Array.isArray(ctx.protocolEvents) ? [...(ctx.protocolEvents as any[])] : [];
  const protocolManager = createDefaultProtocolManager({
    logger: event => {
      protocolEvents.push({ ...event, timestamp: Date.now() });
    }
  });
  let disposed = false;
  const dispose = async () => {
    if (!disposed) {
      disposed = true;
      await protocolManager.dispose();
    }
  };

  let detectedProtocols: ProtocolCapability[] = [];
  try {
    const detection = await protocolManager.detect(
      { host: host.mgmtIp, model: host.model ?? undefined, serviceTag: host.serviceTag ?? undefined },
      { username: idracCreds.username, password: idracCreds.password }
    );
    detectedProtocols = detection.capabilities;
    await updateCtx({ protocolDetection: detection, protocolEvents });
    if (!detection.capabilities.some(cap => cap.supported)) {
      throw new OrchestrationError('No supported management protocols detected', 'critical', { host: host.mgmtIp });
    }
  } catch (error) {
    await dispose();
    await transition('ERROR', {
      error: { message: error instanceof Error ? error.message : String(error) },
      progress: { phase: 'ERROR' }
    });
    return 'ERROR';
  }

  await transition('PRE_DOWNLOAD', { progress: { phase: 'PRE_DOWNLOAD' } });

  let firmwarePlan: any = null;
  let planComponents: Array<{ component: string; imageUri: string }> = [];
  try {
    if (updateMode === 'LATEST_FROM_CATALOG') {
      const requestedComponents = artifactsRows.length ? artifactsRows.map(a => a.component) : ['BIOS', 'iDRAC'];
      firmwarePlan = await buildFirmwarePlan({
        generation: detectedProtocols.find(cap => cap.supported)?.generation ?? 'UNKNOWN',
        model: host.model ?? undefined,
        components: requestedComponents,
        catalogUrl: repoUrl,
        customRepositoryPath: typeof policy.customRepositoryPath === 'string' ? policy.customRepositoryPath : undefined
      });
      planComponents = firmwarePlan.components.map(component => ({ component: component.component, imageUri: component.imageUri }));
      await updateCtx({ firmwarePlan, incompatibilities: firmwarePlan.incompatibilities });
    } else {
      if (!artifactsRows.length) {
        throw new OrchestrationError('No artifacts defined for update plan', 'permanent');
      }
      planComponents = artifactsRows.map(artifact => ({ component: artifact.component, imageUri: artifact.imageUri }));
      await updateCtx({ artifacts: planComponents });
    }
  } catch (error) {
    await dispose();
    await transition('ERROR', {
      error: { message: error instanceof Error ? error.message : String(error) },
      progress: { phase: 'ERROR' }
    });
    return 'ERROR';
  }

  await transition('STAGING', { progress: { phase: 'STAGING' }, components: planComponents });
  const stagingSummary: Array<Record<string, unknown>> = [];
  if (updateMode === 'MULTIPART_FILE') {
    for (const item of planComponents) {
      try {
        const staged = await openFirmwareStream(item.imageUri);
        stagingSummary.push({ component: item.component, fileName: staged.fileName, size: staged.size });
        staged.stream.destroy();
      } catch (error) {
        stagingSummary.push({ component: item.component, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  await updateCtx({ stagingSummary });

  await transition('VALIDATION', {
    progress: { phase: 'VALIDATION' },
    compatibility: firmwarePlan?.incompatibilities ?? []
  });

  await transition('BACKUP_CONFIG', { progress: { phase: 'BACKUP_CONFIG' } });
  let baselineAttestation: any | undefined;
  try {
    const secureBootState = await ensureSecureBoot(host.mgmtIp, idracCreds, {});
    await updateCtx({ secureBootBaseline: secureBootState });
  } catch {
    // ignore secure boot read failures
  }
  try {
    baselineAttestation = await fetchAttestation(host.mgmtIp, idracCreds);
    await updateCtx({ attestationBaseline: baselineAttestation });
  } catch {
    baselineAttestation = undefined;
  }

  const maintenanceWindow = typeof policy.maintenanceWindow === 'object' && policy.maintenanceWindow
    ? policy.maintenanceWindow as Record<string, unknown>
    : null;
  if (maintenanceWindow?.start && maintenanceWindow?.end) {
    const startAt = Date.parse(String(maintenanceWindow.start));
    const endAt = Date.parse(String(maintenanceWindow.end));
    if (Number.isFinite(startAt) && Number.isFinite(endAt)) {
      const now = Date.now();
      if (now < startAt) {
        await dispose();
        await transition('PRECHECKS', {
          progress: { phase: 'PRECHECKS', message: `Awaiting maintenance window starting at ${new Date(startAt).toISOString()}` },
          resumeAt: startAt
        });
        return 'PRECHECKS';
      }
      if (now > endAt) {
        await dispose();
        await transition('ERROR', {
          error: { message: 'Maintenance window has expired' },
          progress: { phase: 'ERROR' }
        });
        return 'ERROR';
      }
    }
  }

  const vcenterRef = host.vcenterUrl && host.hostMoid
    ? await getVcenterCreds(host.id, { url: host.vcenterUrl })
    : null;

  if (host.vcenterUrl && host.hostMoid && vcenterRef) {
    await transition('ENTER_MAINT', {});
    const { token } = await vc.login(vcenterRef.baseUrl, vcenterRef.username, vcenterRef.password);
    const cli = vc.createClient(vcenterRef.baseUrl, token);
    const maintenanceTimeout = Number((policy.maintenanceTimeoutMinutes as number | string | undefined) ?? 120);
    const { taskId } = await cli.enterMaintenance(host.hostMoid, { evacuatePoweredOffVMs: true, timeoutMinutes: maintenanceTimeout });
    await updateCtx({ maintenance: { phase: 'ENTER', taskId } });
    await cli.waitTask(taskId, 30 * 60_000);
    await transition('APPLY', { maintenance: { phase: 'ENTER_COMPLETED', taskId } });
  } else {
    await transition('APPLY', { maintenance: { phase: 'NOT_REQUIRED' } });
  }

  const results: any[] = Array.isArray(ctx.results) ? [...(ctx.results as any[])] : [];
  await updateCtx({ progress: { phase: 'APPLY_INIT', mode: updateMode } satisfies ProgressState, results, protocolEvents });

  const updateResults: any[] = results;
  const credentialsForProtocols = { username: idracCreds.username, password: idracCreds.password };

  const recordProgress = async (progress: ProgressState) => {
    await updateCtx({ progress: { ...progress, updatedAt: Date.now() } });
  };

  let baselineInventory = await collectSoftwareInventory(idracBaseUrl, idracCreds).catch(() => undefined);

  try {
    if (updateMode === 'LATEST_FROM_CATALOG') {
      await recordProgress({ phase: 'INSTALL_FROM_REPOSITORY', taskLocation: null, message: `Using repository ${repoUrl}` });
      const response = await protocolManager.runUpdate({
        host: host.mgmtIp,
        credentials: credentialsForProtocols,
        mode: 'INSTALL_FROM_REPOSITORY',
        components: [],
        repositoryUrl: repoUrl,
        installUpon: (policy.installUpon as 'Immediate' | 'OnReset') ?? 'Immediate',
        additionalParams: { maintenanceWindow }
      } satisfies FirmwareUpdateRequest);
      if (response.taskLocation) {
        const taskLocation = response.taskLocation ?? null;
        await recordProgress({ phase: 'INSTALL_FROM_REPOSITORY', taskLocation });
        const poll = await pollTask({
          idracHost: host.mgmtIp,
          creds: idracCreds,
          taskLocation,
          baselineInventory,
          timeoutMinutes,
          logger: async event => { await recordProgress({ phase: 'INSTALL_FROM_REPOSITORY', taskLocation, event }); }
        });
        updateResults.push({ mode: updateMode, repoUrl, task: poll, protocol: response.protocol });
        await updateCtx({ results: updateResults });
        baselineInventory = poll.inventory?.after ?? baselineInventory;
      } else if (response.protocol === 'RACADM') {
        await recordProgress({ phase: 'RACADM_FALLBACK', fallback: 'RACADM', message: response.messages.join('\n') });
        await redfish.waitForIdrac(host.mgmtIp, idracCreds, timeoutMinutes * 60_000);
        const after = await collectSoftwareInventory(idracBaseUrl, idracCreds).catch(() => undefined);
        const changes = after ? diffInventories(baselineInventory, after) : [];
        updateResults.push({ mode: updateMode, repoUrl, fallback: 'RACADM', metadata: response.metadata, inventory: after ? { before: baselineInventory, after, changes } : undefined });
        await updateCtx({ results: updateResults });
        baselineInventory = after ?? baselineInventory;
      } else {
        updateResults.push({ mode: updateMode, repoUrl, protocol: response.protocol, messages: response.messages });
        await updateCtx({ results: updateResults });
      }
    } else {
      const concurrency = Math.max(1, Number(policy.parallelism ?? 1));
      if (concurrency > 1) {
        baselineInventory = undefined;
      }
      await runWithConcurrency(planComponents, concurrency, async (componentPlan) => {
        const component = componentPlan.component;
        await recordProgress({ phase: 'APPLY_COMPONENT', component, message: `Updating ${component}` });
        if (updateMode === 'SPECIFIC_URL') {
          const response = await protocolManager.runUpdate({
            host: host.mgmtIp,
            credentials: credentialsForProtocols,
            mode: 'SIMPLE_UPDATE',
            components: [{ id: component, imageUri: componentPlan.imageUri }],
            additionalParams: { targets }
          } satisfies FirmwareUpdateRequest);
          if (response.taskLocation) {
            const taskLocation = response.taskLocation ?? null;
            await recordProgress({ phase: 'APPLY_COMPONENT', component, taskLocation, message: 'SimpleUpdate requested' });
            const poll = await pollTask({
              idracHost: host.mgmtIp,
              creds: idracCreds,
              taskLocation,
              baselineInventory,
              timeoutMinutes,
              logger: async event => { await recordProgress({ phase: 'APPLY_COMPONENT', component, taskLocation, event }); }
            });
            updateResults.push({ mode: updateMode, component, imageUri: componentPlan.imageUri, task: poll, protocol: response.protocol });
            await updateCtx({ results: updateResults });
            baselineInventory = poll.inventory?.after ?? baselineInventory;
          } else {
            updateResults.push({ mode: updateMode, component, imageUri: componentPlan.imageUri, protocol: response.protocol, messages: response.messages });
            await updateCtx({ results: updateResults });
          }
        } else {
          const firmware = await openFirmwareStream(componentPlan.imageUri);
          await recordProgress({ phase: 'UPLOAD', component, message: `Uploading ${firmware.fileName}` });
          try {
            const response = await protocolManager.runUpdate({
              host: host.mgmtIp,
              credentials: credentialsForProtocols,
              mode: 'MULTIPART_UPDATE',
              components: [{ id: component, fileName: firmware.fileName, stream: firmware.stream, metadata: { size: firmware.size } }]
            } satisfies FirmwareUpdateRequest);
            const taskLocation = response.taskLocation ?? null;
            if (!taskLocation) throw new ProtocolError('Multipart update did not return a task location', response.protocol, 'transient');
            await recordProgress({ phase: 'UPLOAD', component, taskLocation, message: 'Multipart upload started' });
            const poll = await pollTask({
              idracHost: host.mgmtIp,
              creds: idracCreds,
              taskLocation,
              baselineInventory,
              timeoutMinutes,
              logger: async event => { await recordProgress({ phase: 'UPLOAD', component, taskLocation, event }); }
            });
            updateResults.push({ mode: updateMode, component, imageUri: componentPlan.imageUri, task: poll, fileName: firmware.fileName, protocol: response.protocol });
            await updateCtx({ results: updateResults });
            baselineInventory = poll.inventory?.after ?? baselineInventory;
          } finally {
            firmware.stream.destroy();
          }
        }
      });
    }
  } catch (error) {
    await dispose();
    await transition('ERROR', {
      error: { message: error instanceof Error ? error.message : String(error) },
      progress: { phase: 'ERROR' }
    });
    return 'ERROR';
  }

  await transition('POSTCHECKS', { progress: { phase: 'POSTCHECKS' } });
  try {
    const finalInventory = await collectSoftwareInventory(idracBaseUrl, idracCreds);
    await updateCtx({ finalInventory });
    baselineInventory = finalInventory;
  } catch {
    await updateCtx({ finalInventory: null });
  }

  await transition('POST_VALIDATION', { progress: { phase: 'POST_VALIDATION' } });
  try {
    const attestation = await fetchAttestation(host.mgmtIp, idracCreds);
    await updateCtx({ attestation });
    if (baselineAttestation) {
      const changed = JSON.stringify(attestation) !== JSON.stringify(baselineAttestation);
      await updateCtx({ attestationChanged: changed });
    }
  } catch (error) {
    await updateCtx({ attestationError: error instanceof Error ? error.message : String(error) });
  }

  if (host.vcenterUrl && host.hostMoid && vcenterRef) {
    await transition('EXIT_MAINT', { maintenance: { phase: 'EXIT' } });
    const { token } = await vc.login(vcenterRef.baseUrl, vcenterRef.username, vcenterRef.password);
    const cli = vc.createClient(vcenterRef.baseUrl, token);
    const { taskId } = await cli.exitMaintenance(host.hostMoid);
    await cli.waitTask(taskId, 30 * 60_000);
    await updateCtx({ maintenance: { phase: 'EXIT_COMPLETED', taskId } });
  }

  await transition('DONE', { finishedAt: Date.now(), progress: { phase: 'DONE' }, results: updateResults });
  await dispose();
  return 'DONE';
}
