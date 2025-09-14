import { spawn } from 'node:child_process';
import config from '../../config/index.js';

function run(cmd: string, args: string[], timeoutMs = 15 * 60_000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const t = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('racadm timeout')); }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => { clearTimeout(t); resolve({ code: code ?? 1, stdout, stderr }); });
  });
}

export async function fwupdate(host: string, image: string) {
  const args = ['-r', host, '-u', process.env.IDRAC_USER ?? '', '-p', process.env.IDRAC_PASS ?? '', 'fwupdate', '-g', '-u', '-a', image];
  const { code, stderr } = await run(config.RACADM_PATH, args);
  if (code !== 0) throw new Error(`racadm fwupdate failed: ${stderr}`);
  return { result: 'queued' };
}
