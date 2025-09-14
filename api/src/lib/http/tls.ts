// /api/src/lib/http/tls.ts
import { Agent, setGlobalDispatcher } from 'undici';
import fs from 'node:fs';
import config from '../../config/index.js';

const tls: any = { rejectUnauthorized: config.TLS_REJECT_UNAUTHORIZED };
if (config.CA_BUNDLE_PATH && fs.existsSync(config.CA_BUNDLE_PATH)) {
  tls.ca = fs.readFileSync(config.CA_BUNDLE_PATH, 'utf8');
}

setGlobalDispatcher(new Agent({ connect: { tls } }));