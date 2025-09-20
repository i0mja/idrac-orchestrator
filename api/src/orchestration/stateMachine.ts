import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import db from '../db/index.js';
import { artifacts, hostRuns, hosts, updatePlans } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { detectCapabilities } from '../lib/detect.js';
import * as redfish from '../lib/redfish/client.js';
import { collectSoftwareInventory, diffInventories, pollTask, type InventorySnapshot, type TaskLogEvent } from '../lib/redfish/taskService.js';
import { racadmAutoUpdate } from '../lib/racadm/index.js';
import * as vc from '../lib/vcenter/index.js';
import { getIdracCreds, getVcenterCreds } from '../lib/secrets/adapter.js';

export type UpdateMode = 'LATEST_FROM_CATALOG' | 'SPECIFIC_URL' | 'MULTIPART_FILE';

type State = 'PRECHECKS' | 'ENTER_MAINT' | 'APPLY' | 'REBOOT' | 'POSTCHECKS' | 'EXIT_MAINT' | 'DONE' | 'ERROR';

const DEFAULT_TIMEOUT_MINUTES = Number(process.env.IDRAC_UPDATE_TIMEOUT_MIN ?? '90');

async function setState(id: string, from: State, to: State, ctx: Record<string, unknown> = {}) {
  // Use parameterized query to prevent SQL injection
  await db.execute(sql`SELECT set_host_run_state(${id}, ${from}, ${to}, ${JSON.stringify(ctx)}) AS ok;`);
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

function resolveCatalogUrl(policy: Record<string, unknown>): string {
  const catalog = typeof policy.catalogUrl === 'string' && policy.catalogUrl.trim().length ? policy.catalogUrl.trim() : undefined;
  return catalog ?? redfish.DEFAULT_DELL_CATALOG_URL;
}

function deriveFileName(uri: string) {
  try {
    const parsed = new URL(uri);
    const candidate = parsed.pathname.split('/').filter(Boolean).pop();
    if (candidate) return candidate;
  } catch {
    // fall through to filesystem handling
  }
  return path.basename(uri);
}

function isHttpUrl(uri: string) {
  return /^https?:\/\//i.test(uri);
}

async function openFirmwareStream(imageUri: string): Promise<{ stream: Readable; size?: number; fileName: string }> {
  if (isHttpUrl(imageUri)) {
    const response = await fetch(imageUri);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch firmware image ${imageUri}: ${response.status}`);
    }
    const sizeHeader = response.headers.get('content-length');
    const size = sizeHeader ? Number(sizeHeader) : undefined;
    const fileName = deriveFileName(imageUri) || 'firmware.pkg';
    const nodeStream = Readable.fromWeb(response.body as unknown as ReadableStream);
    return { stream: nodeStream, size: Number.isFinite(size) ? size : undefined, fileName };
  }

  if (imageUri.startsWith('file://')) {
    const filePath = fileURLToPath(new URL(imageUri));
    const stats = await fs.promises.stat(filePath);
    return { stream: fs.createReadStream(filePath), size: stats.size, fileName: path.basename(filePath) };
  }

  const resolved = path.resolve(imageUri);
  const stats = await fs.promises.stat(resolved);
  return { stream: fs.createReadStream(resolved), size: stats.size, fileName: path.basename(resolved) };
}

interface ProgressState {
  phase: string;
  component?: string;
  taskLocation?: string | null;
  message?: string;
  event?: TaskLogEvent;
  fallback?: 'RACADM';
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

  const caps = await detectCapabilities({
    redfish: async () => {
      try { const response = await redfish.redfishFetch(`${idracBaseUrl}/redfish/v1/`); return response.ok; }
      catch { return false; }
    },
    wsman: async () => false,
    racadm: async () => false
  });

  await updateCtx({ mgmtKind: caps.mgmtKind, features: caps.features });

  if (!caps.features.redfish) {
    await transition('ERROR', {
      error: { message: 'Redfish capability not detected' },
      progress: { phase: 'ERROR' }
    });
    return 'ERROR';
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
    await transition('APPLY', {});
  }

  const results: any[] = Array.isArray(ctx.results) ? [...(ctx.results as any[])] : [];
  await updateCtx({ progress: { phase: 'APPLY_INIT', mode: updateMode } satisfies ProgressState, results });

  const updateResults: any[] = results;

  const recordProgress = async (progress: ProgressState) => {
    await updateCtx({ progress: { ...progress, updatedAt: Date.now() } });
  };

  try {
    if (updateMode === 'LATEST_FROM_CATALOG') {
      await recordProgress({ phase: 'INSTALL_FROM_REPOSITORY', taskLocation: null, message: `Using repository ${repoUrl}` });
      let beforeInventory: InventorySnapshot | undefined;
      try { beforeInventory = await collectSoftwareInventory(idracBaseUrl, idracCreds); }
      catch { beforeInventory = undefined; }

      try {
        const response = await redfish.installFromRepository(host.mgmtIp, idracCreds, repoUrl);
        const taskLocation = response.taskLocation ?? null;
        await recordProgress({ phase: 'INSTALL_FROM_REPOSITORY', taskLocation });
        if (!taskLocation) {
          throw new Error('InstallFromRepository did not return a task location');
        }
        const poll = await pollTask({
          idracHost: host.mgmtIp,
          creds: idracCreds,
          taskLocation,
          baselineInventory: beforeInventory,
          timeoutMinutes,
          logger: async event => { await recordProgress({ phase: 'INSTALL_FROM_REPOSITORY', taskLocation, event }); }
        });
        updateResults.push({ mode: updateMode, repoUrl, task: poll });
        await updateCtx({ results: updateResults });
        await recordProgress({ phase: 'INSTALL_FROM_REPOSITORY', taskLocation, message: `Task ${poll.state}` });
      } catch (error) {
        if (error instanceof redfish.RedfishActionMissingError) {
          await recordProgress({ phase: 'RACADM_FALLBACK', fallback: 'RACADM', message: 'Redfish repository action unsupported, falling back to racadm' });
          const before = beforeInventory ?? await collectSoftwareInventory(idracBaseUrl, idracCreds).catch(() => undefined);
          const racadmResult = await racadmAutoUpdate(host.mgmtIp, { username: idracCreds.username, password: idracCreds.password }, repoUrl, {
            timeoutMs: timeoutMinutes * 60_000,
            logger: async event => {
              await recordProgress({ phase: 'RACADM_FALLBACK', fallback: 'RACADM', message: event.type === 'exit' ? `racadm exited ${event.code}` : undefined });
            }
          });
          if (!racadmResult.success) {
            updateResults.push({ mode: updateMode, repoUrl, fallback: 'RACADM', racadm: racadmResult });
            await recordProgress({ phase: 'RACADM_FALLBACK', fallback: 'RACADM', message: racadmResult.failureReason ?? 'racadm reported failure' });
            throw new Error(racadmResult.failureReason ?? 'racadm update failed');
          }
          await recordProgress({ phase: 'RACADM_FALLBACK', fallback: 'RACADM', message: 'racadm command completed, waiting for iDRAC' });
          await redfish.waitForIdrac(host.mgmtIp, idracCreds, timeoutMinutes * 60_000);
          const after = await collectSoftwareInventory(idracBaseUrl, idracCreds).catch(() => undefined);
          const changes = after ? diffInventories(before, after) : [];
          updateResults.push({ mode: updateMode, repoUrl, fallback: 'RACADM', racadm: racadmResult, inventory: after ? { before, after, changes } : undefined });
          await updateCtx({ results: updateResults });
          await recordProgress({ phase: 'RACADM_FALLBACK', fallback: 'RACADM', message: 'racadm update completed' });
        } else {
          throw error;
        }
      }
    } else {
      if (!artifactsRows.length) {
        throw new Error('No artifacts defined for update plan');
      }
      let baseline = await collectSoftwareInventory(idracBaseUrl, idracCreds).catch(() => undefined);
      for (const artifact of artifactsRows) {
        const component = artifact.component;
        await recordProgress({ phase: 'APPLY_COMPONENT', component, taskLocation: null, message: `Updating ${component}` });
        if (updateMode === 'SPECIFIC_URL') {
          const response = await redfish.simpleUpdate(host.mgmtIp, idracCreds, artifact.imageUri, targets);
          const taskLocation = response.taskLocation ?? null;
          await recordProgress({ phase: 'APPLY_COMPONENT', component, taskLocation, message: 'SimpleUpdate requested' });
          if (!taskLocation) throw new Error('SimpleUpdate did not return a task location');
          const poll = await pollTask({
            idracHost: host.mgmtIp,
            creds: idracCreds,
            taskLocation,
            baselineInventory: baseline,
            timeoutMinutes,
            logger: async event => { await recordProgress({ phase: 'APPLY_COMPONENT', component, taskLocation, event }); }
          });
          updateResults.push({ mode: updateMode, component, imageUri: artifact.imageUri, task: poll });
          await updateCtx({ results: updateResults });
          baseline = poll.inventory?.after ?? baseline;
        } else {
          const firmware = await openFirmwareStream(artifact.imageUri);
          await recordProgress({ phase: 'UPLOAD', component, message: `Uploading ${firmware.fileName}` });
          const response = await redfish.multipartUpdate(host.mgmtIp, idracCreds, {
            fileName: firmware.fileName,
            fileStream: firmware.stream,
            size: firmware.size,
            updateParameters: {}
          });
          const taskLocation = response.taskLocation ?? null;
          await recordProgress({ phase: 'UPLOAD', component, taskLocation, message: 'Multipart upload started' });
          if (!taskLocation) throw new Error('Multipart update did not return a task location');
          const poll = await pollTask({
            idracHost: host.mgmtIp,
            creds: idracCreds,
            taskLocation,
            baselineInventory: baseline,
            timeoutMinutes,
            logger: async event => { await recordProgress({ phase: 'UPLOAD', component, taskLocation, event }); }
          });
          updateResults.push({ mode: updateMode, component, imageUri: artifact.imageUri, task: poll, fileName: firmware.fileName });
          await updateCtx({ results: updateResults });
          baseline = poll.inventory?.after ?? baseline;
        }
      }
    }
  } catch (error) {
    await transition('ERROR', {
      error: {
        message: error instanceof Error ? error.message : String(error)
      },
      progress: { phase: 'ERROR' }
    });
    return 'ERROR';
  }

  await transition('POSTCHECKS', { progress: { phase: 'POSTCHECKS' } });
  try {
    const finalInventory = await collectSoftwareInventory(idracBaseUrl, idracCreds);
    await updateCtx({ finalInventory });
  } catch {
    await updateCtx({ finalInventory: null });
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
  return 'DONE';
}
