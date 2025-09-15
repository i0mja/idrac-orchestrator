import { pgTable, uuid, text, varchar, jsonb, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const hosts = pgTable('hosts', {
  id: uuid('id').primaryKey().defaultRandom(),
  fqdn: text('fqdn').notNull(),
  mgmtIp: varchar('mgmt_ip', { length: 45 }).notNull(),
  model: text('model'),
  serviceTag: text('service_tag'),
  mgmtKind: text('mgmt_kind'),
  vcenterUrl: text('vcenter_url'),
  clusterMoid: text('cluster_moid'),
  hostMoid: text('host_moid'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),           // 'idrac' | 'vcenter'
  vaultPath: text('vault_path').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const updatePlans = pgTable('update_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  policy: jsonb('policy').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at').defaultNow()
});

export const planTargets = pgTable('plan_targets', {
  planId: uuid('plan_id').references(() => updatePlans.id, { onDelete: 'cascade' }).notNull(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull()
});

export const artifacts = pgTable('artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => updatePlans.id, { onDelete: 'cascade' }).notNull(),
  component: text('component').notNull(), // BIOS | iDRAC | NIC | HBA | RAID | PSU | Other
  imageUri: text('image_uri').notNull()
});

export const hostRuns = pgTable('host_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => updatePlans.id, { onDelete: 'cascade' }).notNull(),
  hostId: uuid('host_id').references(() => hosts.id, { onDelete: 'cascade' }).notNull(),
  state: text('state').notNull(), // PRECHECKS|ENTER_MAINT|APPLY|REBOOT|POSTCHECKS|EXIT_MAINT|DONE|ERROR
  ctx: jsonb('ctx').$type<Record<string, unknown>>().notNull().default({}),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const vcenters = pgTable('vcenters', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  hostname: text('hostname').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  port: integer('port').notNull().default(443),
  ignoreSsl: boolean('ignore_ssl').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const systemConfig = pgTable('system_config', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});
