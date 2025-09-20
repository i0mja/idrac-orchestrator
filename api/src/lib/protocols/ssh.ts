import { spawn } from 'node:child_process';
import { ProtocolError } from '../errors.js';
import type {
  Credentials,
  FirmwareUpdateRequest,
  FirmwareUpdateResult,
  ProtocolCapability,
  ProtocolClient,
  ProtocolHealth,
  ServerIdentity
} from './types.js';

export class SshProtocolClient implements ProtocolClient {
  readonly protocol = 'SSH' as const;
  readonly priority = 50;

  async detectCapability(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolCapability> {
    try {
      await runSsh(identity.host, credentials, 'uname -a');
      return {
        protocol: this.protocol,
        supported: true,
        updateModes: ['CUSTOM_PROTOCOL'],
        raw: { shell: 'ssh' }
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
      const output = await runSsh(identity.host, credentials, 'uptime');
      return { protocol: this.protocol, status: 'healthy', checkedAt: Date.now(), details: output };
    } catch (error) {
      return {
        protocol: this.protocol,
        status: 'unreachable',
        checkedAt: Date.now(),
        details: error instanceof Error ? error.message : String(error),
        lastErrorClassification: 'transient'
      };
    }
  }

  async performFirmwareUpdate(_request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    throw new ProtocolError('SSH requires custom workflow integration', this.protocol, 'permanent');
  }
}

function runSsh(host: string, creds: Credentials, command: string, timeoutMs = 5_000) {
  return new Promise<string>((resolve, reject) => {
    const args = [
      '-o', 'BatchMode=yes',
      '-o', 'StrictHostKeyChecking=no',
      '-p', String(creds.port ?? 22),
      `${creds.username}@${host}`,
      command
    ];
    const env = { ...process.env };
    if (creds.password) {
      env.SSH_ASKPASS_REQUIRE = 'force';
    }
    const child = spawn(process.env.SSH_BIN ?? 'ssh', args, { stdio: ['ignore', 'pipe', 'pipe'], env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new ProtocolError('ssh command timed out', 'SSH', 'transient'));
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
        reject(new ProtocolError(`ssh exited with ${code}: ${stderr}`, 'SSH', 'transient'));
      }
    });
  });
}
