import { spawnSync } from 'node:child_process';
import config from '../../config/index.js';

function run(host: string, ...extra: string[]) {
  const user = process.env.IDRAC_USER ?? '';
  const pass = process.env.IDRAC_PASS ?? '';
  const { status, stderr, stdout } = spawnSync(config.IPMITOOL_PATH, ['-I','lanplus','-H',host,'-U',user,'-P',pass, ...extra], { timeout: 30_000 });
  if (status !== 0) throw new Error(stderr.toString() || 'ipmitool error');
  return stdout.toString();
}

export function powerStatus(host: string) { return run(host, 'chassis','power','status').trim(); }
export function powerOn(host: string) { return run(host, 'chassis','power','on').trim(); }
export function powerOff(host: string) { return run(host, 'chassis','power','off').trim(); }
export function powerCycle(host: string) { return run(host, 'chassis','power','cycle').trim(); }
