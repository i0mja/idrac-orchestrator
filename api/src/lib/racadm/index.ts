import { spawn } from 'node:child_process';

export interface RacadmCreds { username: string; password: string; }

export type RacadmLoggerEvent =
  | { type: 'start'; command: string; args: string[] }
  | { type: 'stdout'; chunk: string }
  | { type: 'stderr'; chunk: string }
  | { type: 'exit'; code: number };

export type RacadmLogger = (event: RacadmLoggerEvent) => void;

export interface RacadmAutoUpdateResult {
  code: number;
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  successMessage?: string;
  failureReason?: string;
}

export interface RacadmAutoUpdateOptions {
  timeoutMs?: number;
  logger?: RacadmLogger;
}

const DEFAULT_TIMEOUT_MS = 30 * 60_000;

function getBinary() {
  return process.env.RACADM_BIN ?? process.env.RACADM_PATH ?? 'racadm';
}

function runRacadm(args: string[], options: RacadmAutoUpdateOptions) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const logger = options.logger;
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const cmd = getBinary();
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('racadm timeout'));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      logger?.({ type: 'stdout', chunk: text });
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      logger?.({ type: 'stderr', chunk: text });
    });
    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', code => {
      clearTimeout(timer);
      logger?.({ type: 'exit', code: code ?? 1 });
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function sanitizeArgs(host: string, creds: RacadmCreds, repoUrl: string) {
  return ['-r', host, '-u', creds.username, '-p', '********', 'fwupdate', '-g', '-u', '-a', repoUrl];
}

function detectFailure(stdout: string, stderr: string) {
  const combined = `${stdout}\n${stderr}`;
  const match = combined.match(/(error|fail(?:ed)?|invalid|not supported)[^\n]*/i);
  return match ? match[0].trim() : undefined;
}

function detectSuccess(stdout: string) {
  const match = stdout.match(/(success|completed)[^\n]*/i);
  return match ? match[0].trim() : undefined;
}

export async function racadmAutoUpdate(
  host: string,
  creds: RacadmCreds,
  repoUrl: string,
  options: RacadmAutoUpdateOptions = {}
): Promise<RacadmAutoUpdateResult> {
  if (!creds.username || !creds.password) {
    throw new Error('racadm credentials missing username or password');
  }
  const args = ['-r', host, '-u', creds.username, '-p', creds.password, 'fwupdate', '-g', '-u', '-a', repoUrl];
  const logger = options.logger;
  if (logger) {
    logger({ type: 'start', command: getBinary(), args: sanitizeArgs(host, creds, repoUrl) });
  }
  const startedAt = Date.now();
  const { code, stdout, stderr } = await runRacadm(args, options);
  const durationMs = Date.now() - startedAt;

  const failureReason = detectFailure(stdout, stderr);
  const successMessage = detectSuccess(stdout);
  const success = code === 0 && !failureReason;

  return { code, success, stdout, stderr, durationMs, successMessage, failureReason };
}
