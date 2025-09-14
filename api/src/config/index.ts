import { z } from 'zod';

const schema = z.object({
  API_PORT: z.string().default('8080').transform(Number),
  API_BASE_URL: z.string().url().default('http://localhost:8080'),

  PGHOST: z.string().default('localhost'),
  PGPORT: z.string().default('5432').transform(Number),
  PGDATABASE: z.string().default('idrac_orchestrator'),
  PGUSER: z.string().default('idrac_admin'),
  PGPASSWORD: z.string().default('change-me'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  API_KEY: z.string().default('dev-api-key'),
  TLS_REJECT_UNAUTHORIZED: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  CA_BUNDLE_PATH: z.string().optional(),

  VCENTER_URL: z.string().optional(),
  VCENTER_USERNAME: z.string().optional(),
  VCENTER_PASSWORD: z.string().optional(),

  RACADM_PATH: z.string().default('racadm'),
  IPMITOOL_PATH: z.string().default('ipmitool'),
});

export type Config = z.infer<typeof schema>;
export const config: Config = schema.parse(process.env);
export default config;
