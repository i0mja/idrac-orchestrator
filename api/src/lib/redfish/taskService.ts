import { authHeader, IdracCreds, normalizeBaseUrl, redfishFetch, resolveLocation, readResponseBody, RedfishError } from './client.js';

const DEFAULT_TIMEOUT_MINUTES = Number(process.env.IDRAC_UPDATE_TIMEOUT_MIN ?? '90');
const TERMINAL_STATES = new Set(['Completed', 'CompletedOK', 'CompletedWithWarnings', 'Cancelled', 'Exception', 'Killed', 'Failed']);
const FAILURE_STATES = new Set(['Exception', 'Cancelled', 'Killed', 'Failed']);
const START_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 15_000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface TaskLogEvent {
  type: 'poll' | 'retry' | 'complete' | 'wait-idrac' | 'idrac-online' | 'error';
  timestamp: number;
  state?: string;
  status?: string;
  progress?: number;
  backoffMs?: number;
  message?: string;
}

export type TaskLogger = (event: TaskLogEvent) => void | Promise<void>;

export interface InventoryComponent {
  id: string;
  name?: string;
  version?: string;
  uri?: string;
  raw?: any;
}

export interface InventorySnapshot {
  raw: any;
  components: Record<string, InventoryComponent>;
}

export interface InventoryChange {
  id: string;
  name?: string;
  previousVersion?: string;
  currentVersion?: string;
  changeType: 'added' | 'removed' | 'updated';
}

export interface TaskPollResult {
  task: any;
  taskLocation: string;
  state: string;
  status?: string;
  completed: boolean;
  messages: string[];
  oemDell?: unknown;
  percentComplete?: number;
  durationMs: number;
  inventory?: {
    before?: InventorySnapshot;
    after: InventorySnapshot;
    changes: InventoryChange[];
  };
}

export interface PollTaskOptions {
  idracHost: string;
  creds: IdracCreds;
  taskLocation?: string | null;
  baselineInventory?: InventorySnapshot;
  logger?: TaskLogger;
  timeoutMinutes?: number;
}

export async function pollTask(options: PollTaskOptions): Promise<TaskPollResult> {
  const baseUrl = normalizeBaseUrl(options.idracHost);
  const resolvedLocation = options.taskLocation ? resolveLocation(baseUrl, options.taskLocation) ?? options.taskLocation : null;
  if (!resolvedLocation) {
    throw new Error('Task location not provided by Redfish response');
  }

  const timeoutMinutes = options.timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;
  const deadline = Date.now() + timeoutMinutes * 60_000;
  const logger = options.logger;
  const startedAt = Date.now();

  let beforeInventory = options.baselineInventory;
  if (!beforeInventory) {
    try {
      beforeInventory = await collectSoftwareInventory(baseUrl, options.creds);
    } catch (error) {
      logger?.({
        type: 'error',
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  let backoff = START_BACKOFF_MS;
  let finalTask: any | null = null;
  let state = '';
  let status = '';
  let percentComplete: number | undefined;
  let messages: string[] = [];
  let oemDell: unknown;

  while (Date.now() < deadline) {
    try {
      const res = await redfishFetch(resolvedLocation, {
        headers: { authorization: authHeader(options.creds) }
      });

      if (!res.ok) {
        const body = await readResponseBody(res);
        if (res.status >= 500 || res.status === 404) {
          logger?.({ type: 'retry', timestamp: Date.now(), message: `Transient response ${res.status}`, backoffMs: backoff });
          await sleep(backoff);
          backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
          continue;
        }
        throw new RedfishError('Task poll failed', res.status, body);
      }

      const task = await res.json();
      state = String(task.TaskState ?? task.JobState ?? task.Status ?? '');
      status = String(task.TaskStatus ?? task.Status ?? '');
      percentComplete = typeof task.PercentComplete === 'number' ? task.PercentComplete : percentComplete;
      messages = Array.isArray(task.Messages)
        ? task.Messages.map((m: any) => m?.Message ?? m?.MessageId ?? m?.Resolution ?? JSON.stringify(m))
        : messages;
      oemDell = task?.Oem?.Dell ?? oemDell;

      await Promise.resolve(logger?.({
        type: 'poll',
        timestamp: Date.now(),
        state,
        status,
        progress: percentComplete,
        backoffMs: backoff
      }));

      if (TERMINAL_STATES.has(state)) {
        finalTask = task;
        break;
      }

      await sleep(backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    } catch (error) {
      if (shouldRetry(error)) {
        await Promise.resolve(logger?.({
          type: 'retry',
          timestamp: Date.now(),
          message: error instanceof Error ? error.message : String(error),
          backoffMs: backoff
        }));
        await sleep(backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        continue;
      }

      await Promise.resolve(logger?.({
        type: 'error',
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    }
  }

  if (!finalTask) {
    throw new Error('Timed out waiting for Redfish task completion');
  }

  await Promise.resolve(logger?.({ type: 'complete', timestamp: Date.now(), state, status }));

  const completedSuccessfully = !FAILURE_STATES.has(state) && !/Exception|Error|Failed/i.test(status);

  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) throw new Error('Timed out before iDRAC recovery phase');

  await waitForIdracServiceRoot(baseUrl, options.creds, deadline, logger);

  let afterInventory: InventorySnapshot | undefined;
  try {
    afterInventory = await collectSoftwareInventory(baseUrl, options.creds);
  } catch (error) {
    await Promise.resolve(logger?.({
      type: 'error',
      timestamp: Date.now(),
      message: error instanceof Error ? error.message : String(error)
    }));
  }

  const changes = afterInventory ? diffInventories(beforeInventory, afterInventory) : [];
  return {
    task: finalTask,
    taskLocation: resolvedLocation,
    state,
    status,
    completed: completedSuccessfully,
    messages,
    oemDell,
    percentComplete,
    durationMs: Date.now() - startedAt,
    inventory: afterInventory
      ? {
          before: beforeInventory,
          after: afterInventory,
          changes
        }
      : undefined
  };
}

async function waitForIdracServiceRoot(baseUrl: string, creds: IdracCreds, deadline: number, logger?: TaskLogger) {
  const url = `${baseUrl}/redfish/v1/`;
  let attempt = 0;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await redfishFetch(url, {
        headers: { authorization: authHeader(creds) },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        await Promise.resolve(logger?.({ type: 'idrac-online', timestamp: Date.now() }));
        return;
      }
      if (res.status >= 500) {
        await Promise.resolve(
          logger?.({ type: 'retry', timestamp: Date.now(), message: `Service root ${res.status}`, backoffMs: START_BACKOFF_MS })
        );
      } else {
        const body = await readResponseBody(res);
        throw new RedfishError('Unexpected response while waiting for iDRAC service root', res.status, body);
      }
    } catch (error) {
      clearTimeout(timeout);
      if (!shouldRetry(error)) throw error;
    } finally {
      clearTimeout(timeout);
    }

    await Promise.resolve(
      logger?.({ type: 'wait-idrac', timestamp: Date.now(), backoffMs: Math.min(5000, START_BACKOFF_MS * (attempt + 1)) })
    );
    await sleep(Math.min(5000, START_BACKOFF_MS * Math.pow(1.5, attempt++)));
  }
  throw new Error('Timed out waiting for iDRAC to return after update');
}

export async function collectSoftwareInventory(baseUrl: string, creds: IdracCreds): Promise<InventorySnapshot> {
  const url = `${baseUrl}/redfish/v1/UpdateService/SoftwareInventory`;
  const res = await redfishFetch(url, { headers: { authorization: authHeader(creds) } });
  if (!res.ok) {
    const body = await readResponseBody(res);
    throw new RedfishError('Failed to read SoftwareInventory', res.status, body);
  }

  const data = await res.json();
  const members = Array.isArray(data?.Members) ? data.Members : [];
  const components: Record<string, InventoryComponent> = {};
  const seen = new Set<string>();

  for (const member of members) {
    const memberUri = typeof member === 'string' ? member : member?.['@odata.id'] ?? member?.MemberId ?? member?.Id;
    if (!memberUri) continue;
    const absolute = resolveLocation(baseUrl, typeof member === 'string' ? member : member?.['@odata.id'] ?? null) ?? memberUri;
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    try {
      const compRes = await redfishFetch(absolute, { headers: { authorization: authHeader(creds) } });
      if (!compRes.ok) continue;
      const detail = await compRes.json();
      const id = String(detail?.Id ?? detail?.ComponentID ?? detail?.MemberId ?? absolute);
      components[id] = {
        id,
        name: detail?.Name ?? detail?.Description ?? detail?.ComponentName ?? id,
        version: detail?.Version ?? detail?.FirmwareVersion ?? detail?.SoftwareVersion ?? detail?.Build ?? detail?.CurrentVersion,
        uri: absolute,
        raw: detail
      };
    } catch {
      // ignore individual component failures
    }
  }

  return { raw: data, components };
}

export function diffInventories(before?: InventorySnapshot, after?: InventorySnapshot): InventoryChange[] {
  const beforeMap = before?.components ?? {};
  const afterMap = after?.components ?? {};
  const keys = new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]);
  const changes: InventoryChange[] = [];

  for (const key of keys) {
    const prev = beforeMap[key];
    const next = afterMap[key];
    if (!next) {
      changes.push({
        id: prev?.id ?? key,
        name: prev?.name,
        previousVersion: prev?.version,
        currentVersion: undefined,
        changeType: 'removed'
      });
      continue;
    }
    if (!prev) {
      changes.push({
        id: next.id,
        name: next.name,
        previousVersion: undefined,
        currentVersion: next.version,
        changeType: 'added'
      });
      continue;
    }
    if (prev.version !== next.version) {
      changes.push({
        id: next.id,
        name: next.name ?? prev.name,
        previousVersion: prev.version,
        currentVersion: next.version,
        changeType: 'updated'
      });
    }
  }

  return changes.sort((a, b) => a.id.localeCompare(b.id));
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof RedfishError) {
    return error.status >= 500 || error.status === 404;
  }
  if (error && typeof error === 'object') {
    const err = error as NodeJS.ErrnoException;
    if (typeof err.code === 'string' && ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'].includes(err.code)) {
      return true;
    }
  }
  if (error instanceof Error) {
    const msg = error.message || '';
    return /(ECONNRESET|ECONNREFUSED|ETIMEDOUT|fetch failed|network|socket hang up)/i.test(msg);
  }
  return false;
}
