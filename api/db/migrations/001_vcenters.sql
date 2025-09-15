CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS vcenters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 443,
  ignore_ssl BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vcenters_hostname ON vcenters(hostname);
