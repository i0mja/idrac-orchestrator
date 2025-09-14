import { spawn } from 'node:child_process';
import config from '../../config/index.js';

function run(cmd: string, args: string[], timeoutMs = 15 * 60_000) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const t = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('racadm timeout')); }, timeoutMs);
    child.stdout.on('data', d => (stdout += d));
    child.stderr.on('data', d => (stderr += d));
    child.on('error', reject);
    child.on('close', code => { clearTimeout(t); resolve({ code: code ?? 1, stdout, stderr }); });
  });
}

export async function fwupdate(host: string, imageServer: string) {
  const user = process.env.IDRAC_USER ?? '';
  const pass = process.env.IDRAC_PASS ?? '';
  if (!user || !pass) throw new Error('RACADM needs IDRAC_USER/IDRAC_PASS env');
  const args = ['-r', host, '-u', user, '-p', pass, 'fwupdate', '-g', '-u', '-a', imageServer];
  const { code, stderr } = await run(config.RACADM_PATH, args);
  if (code !== 0) throw new Error(`racadm fwupdate failed: ${stderr}`);
  return { result: 'queued' };
}
