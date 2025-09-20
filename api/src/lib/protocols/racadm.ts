import { spawn } from 'node:child_process';
import { racadmAutoUpdate } from '../racadm/index.js';
import { classifyError, ProtocolError } from '../errors.js';
import type {
  Credentials,
  FirmwareUpdateRequest,
  FirmwareUpdateResult,
  ProtocolCapability,
  ProtocolClient,
  ProtocolHealth,
  ServerIdentity
} from './types.js';

export class RacadmProtocolClient implements ProtocolClient {
  readonly protocol = 'RACADM' as const;
  readonly priority = 30;

  async detectCapability(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolCapability> {
    if (!credentials.username || !credentials.password) {
      return { protocol: this.protocol, supported: false, updateModes: [], raw: { reason: 'missing credentials' } };
    }
    try {
      await runRacadm(identity.host, credentials, ['getsysinfo'], 5_000);
      return {
        protocol: this.protocol,
        supported: true,
        updateModes: ['INSTALL_FROM_REPOSITORY'],
        raw: { version: await runRacadm(identity.host, credentials, ['getversion'], 5_000).catch(() => undefined) }
      };
    } catch (error) {
      return {
        protocol: this.protocol,
        supported: false,
        updateModes: [],
        raw: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  async healthCheck(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolHealth> {
    try {
      await runRacadm(identity.host, credentials, ['getsysinfo'], 5_000);
      return {
        protocol: this.protocol,
        status: 'healthy',
        checkedAt: Date.now(),
        details: 'racadm reachable'
      };
    } catch (error) {
      return {
        protocol: this.protocol,
        status: 'unreachable',
        checkedAt: Date.now(),
        details: error instanceof Error ? error.message : String(error),
        lastErrorClassification: classifyError(error)
      };
    }
  }

  async performFirmwareUpdate(request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    const repo = request.repositoryUrl ?? request.additionalParams?.repository;
    if (!repo) {
      throw new ProtocolError('racadm requires repository URL', this.protocol, 'permanent');
    }
    const startedAt = Date.now();
    const result = await racadmAutoUpdate(request.host, { username: request.credentials.username, password: request.credentials.password }, repo, {
      timeoutMs: Number(request.additionalParams?.timeoutMs ?? 30 * 60_000)
    });
    return {
      protocol: this.protocol,
      status: result.success ? 'COMPLETED' : 'FAILED',
      startedAt,
      completedAt: Date.now(),
      messages: [result.successMessage ?? result.failureReason ?? 'racadm update executed'],
      metadata: result
    };
  }
}

function getBinary() {
  return process.env.RACADM_BIN ?? process.env.RACADM_PATH ?? 'racadm';
}

function runRacadm(host: string, creds: Credentials, args: string[], timeoutMs = 5_000) {
  return new Promise<string>((resolve, reject) => {
    const commandArgs = ['-r', host, '-u', creds.username, '-p', creds.password, ...args];
    const child = spawn(getBinary(), commandArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new ProtocolError('racadm command timed out', 'RACADM', 'transient'));
    }, timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new ProtocolError(`racadm exited with ${code}: ${stderr}`, 'RACADM', 'transient'));
      }
    });
  });
}
