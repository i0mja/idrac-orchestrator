CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS hosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fqdn TEXT NOT NULL,
  mgmt_ip VARCHAR(45) NOT NULL,
  model TEXT,
  service_tag TEXT,
  mgmt_kind TEXT,
  vcenter_url TEXT,
  cluster_moid TEXT,
  host_moid TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  vault_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS update_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  policy JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_targets (
  plan_id UUID REFERENCES update_plans(id) ON DELETE CASCADE,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, host_id)
);

CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES update_plans(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  image_uri TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS host_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES update_plans(id) ON DELETE CASCADE,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  ctx JSONB NOT NULL DEFAULT '{}',
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hosts_cluster ON hosts (cluster_moid);
CREATE INDEX IF NOT EXISTS idx_host_runs_plan_host ON host_runs (plan_id, host_id);
CREATE INDEX IF NOT EXISTS idx_plan_targets_plan ON plan_targets (plan_id);

CREATE OR REPLACE FUNCTION set_host_run_state(p_id UUID, p_from TEXT, p_to TEXT, p_ctx JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  UPDATE host_runs
     SET state = p_to,
         ctx = COALESCE(p_ctx,'{}'::jsonb),
         updated_at = now()
   WHERE id = p_id AND state = p_from;
  RETURN FOUND;
END$$;
