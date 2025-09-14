import { pgTable, uuid, text, varchar, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
  hostId: uuid('host_id').notNull().references(() => hosts.id),
  kind: text('kind').notNull(),
  vaultPath: text('vault_path').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const updatePlans = pgTable('update_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  policy: jsonb('policy').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow()
});

export const planTargets = pgTable('plan_targets', {
  planId: uuid('plan_id').references(() => updatePlans.id),
  hostId: uuid('host_id').references(() => hosts.id)
});

export const artifacts = pgTable('artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => updatePlans.id),
  component: text('component').notNull(),
  imageUri: text('image_uri').notNull()
});

export const hostRuns = pgTable('host_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => updatePlans.id),
  hostId: uuid('host_id').references(() => hosts.id),
  state: text('state').notNull(),
  ctx: jsonb('ctx').$type<Record<string, unknown>>().default({}),
  attempts: integer('attempts').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const hostsRelations = relations(hosts, ({ many }) => ({
  credentials: many(credentials),
  runs: many(hostRuns)
}));

