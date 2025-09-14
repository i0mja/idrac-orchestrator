import { Agent, setGlobalDispatcher } from 'undici';
import fs from 'node:fs';
import path from 'node:path';
import config from '../../config/index.js';

const tls: any = { rejectUnauthorized: config.TLS_REJECT_UNAUTHORIZED };
if (config.CA_BUNDLE_PATH) {
  const p = path.resolve(config.CA_BUNDLE_PATH);
  if (fs.existsSync(p)) tls.ca = fs.readFileSync(p, 'utf8');
}
setGlobalDispatcher(new Agent({ connect: { tls } } as any));
