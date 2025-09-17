import { z } from 'zod';

const envSchema = z.object({
  API_PORT: z.coerce.number().default(8081),
  API_BASE_URL: z.string().default('http://localhost:8081'),
  API_KEY: z.string().default('dev-api-key'),
  DISABLE_WORKER: z.string().default('false'),

  PGHOST: z.string().default('localhost'),
  PGPORT: z.coerce.number().default(5432),
  PGDATABASE: z.string().default('idrac_orchestrator'),
  PGUSER: z.string().default('idrac_admin'),
  PGPASSWORD: z.string().default('devpass'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  TLS_REJECT_UNAUTHORIZED: z
    .string()
    .default('true')
    .transform(v => v !== 'false'),

  CA_BUNDLE_PATH: z.string().optional().default(''),
  IDRAC_CA_PEM: z.string().optional().default(''),

  DELL_CATALOG_URL: z.string().default('https://downloads.dell.com/catalog/Catalog.xml.gz'),

  IDRAC_UPDATE_TIMEOUT_MIN: z.coerce.number().default(90),

  // Defaults; per-host overrides live in DB/credentials
  VCENTER_URL: z.string().optional().default(''),
  VCENTER_USERNAME: z.string().optional().default(''),
  VCENTER_PASSWORD: z.string().optional().default(''),

  // Runner binaries
  RACADM_BIN: z.string().default(process.env.RACADM_PATH ?? 'racadm'),
  RACADM_PATH: z.string().default('racadm'),
  IPMITOOL_PATH: z.string().default('ipmitool')
});

const env = envSchema.parse(process.env);

export default {
  ...env
};
export type Config = typeof env;
