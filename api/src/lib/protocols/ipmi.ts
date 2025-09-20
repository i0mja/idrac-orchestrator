import { spawn } from 'node:child_process';
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

const DEFAULT_INTERFACE = 'lanplus';

export class IpmiProtocolClient implements ProtocolClient {
  readonly protocol = 'IPMI' as const;
  readonly priority = 40;

  async detectCapability(identity: ServerIdentity, credentials: Credentials): Promise<ProtocolCapability> {
    try {
      await runIpmitool(identity.host, credentials, ['chassis', 'status']);
      return {
        protocol: this.protocol,
        supported: true,
        updateModes: ['CUSTOM_PROTOCOL'],
        raw: { interface: DEFAULT_INTERFACE }
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
      const result = await runIpmitool(identity.host, credentials, ['chassis', 'status']);
      return {
        protocol: this.protocol,
        status: 'healthy',
        checkedAt: Date.now(),
        details: result
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

  async performFirmwareUpdate(_request: FirmwareUpdateRequest): Promise<FirmwareUpdateResult> {
    throw new ProtocolError('IPMI firmware updates require custom tooling', this.protocol, 'permanent');
  }
}

function runIpmitool(host: string, creds: Credentials, args: string[], timeoutMs = 5_000) {
  return new Promise<string>((resolve, reject) => {
    const commandArgs = ['-I', DEFAULT_INTERFACE, '-H', host, '-U', creds.username, '-P', creds.password ?? '', ...args];
    const child = spawn(process.env.IPMITOOL_BIN ?? 'ipmitool', commandArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new ProtocolError('ipmitool timed out', 'IPMI', 'transient'));
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
        reject(new ProtocolError(`ipmitool exited with ${code}: ${stderr}`, 'IPMI', 'transient'));
      }
    });
  });
}
