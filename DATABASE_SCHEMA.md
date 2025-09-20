# Database Schema Documentation

## Overview

The iDRAC Updater Orchestrator uses a dual-database architecture to support both cloud-native and on-premise deployments:

- **Supabase PostgreSQL**: Primary database for web application with RLS policies
- **Local PostgreSQL**: On-premise API database for direct server integration

## Primary Schema (Supabase)

### Core Tables

#### `hosts`
Primary server inventory table containing all discovered servers.

```sql
CREATE TABLE hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Indexes for performance
CREATE INDEX idx_hosts_cluster ON hosts (cluster_moid);
CREATE INDEX idx_hosts_mgmt_ip ON hosts (mgmt_ip);
CREATE INDEX idx_hosts_service_tag ON hosts (service_tag);
```

**Key Fields:**
- `fqdn`: Fully qualified domain name for network identification
- `mgmt_ip`: Management IP address (iDRAC/BMC)
- `mgmt_kind`: Management interface type (redfish, ipmi, racadm)
- `vcenter_url`: Associated vCenter server URL
- `cluster_moid`: VMware cluster managed object ID
- `host_moid`: VMware host managed object ID
- `tags`: Flexible tagging for grouping and filtering

#### `credentials`
Secure credential management with vault-based storage.

```sql
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    vault_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_credentials_host ON credentials (host_id);
CREATE INDEX idx_credentials_kind ON credentials (kind);
```

**Key Fields:**
- `kind`: Credential type (idrac, vcenter, ipmi, ssh)
- `vault_path`: Encrypted credential storage path
- `host_id`: Associated server (nullable for global credentials)

#### `update_plans`
Update campaign definitions with orchestration policies.

```sql
CREATE TABLE update_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    policy JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id),
    maintenance_window JSONB,
    approval_required BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_plans_status ON update_plans (status);
CREATE INDEX idx_plans_created_by ON update_plans (created_by);
```

**Policy JSONB Structure:**
```json
{
  "updateMode": "LATEST_FROM_CATALOG|SPECIFIC_PACKAGE|MULTIPART_FILE",
  "catalogUrl": "https://downloads.dell.com/catalog/Catalog.xml.gz",
  "maxConcurrent": 1,
  "minHostsOnline": 1,
  "requireMaintenanceMode": true,
  "allowDowntime": false,
  "rollbackOnFailure": true,
  "preflightChecks": ["connectivity", "compatibility", "cluster_health"],
  "postUpdateValidation": ["firmware_version", "system_health", "network_connectivity"]
}
```

#### `plan_targets`
Many-to-many relationship between plans and target hosts.

```sql
CREATE TABLE plan_targets (
    plan_id UUID REFERENCES update_plans(id) ON DELETE CASCADE,
    host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    conditions JSONB DEFAULT '{}',
    PRIMARY KEY (plan_id, host_id)
);

-- Indexes
CREATE INDEX idx_plan_targets_plan ON plan_targets (plan_id);
CREATE INDEX idx_plan_targets_host ON plan_targets (host_id);
CREATE INDEX idx_plan_targets_priority ON plan_targets (plan_id, priority);
```

#### `artifacts`
Firmware packages and update artifacts associated with plans.

```sql
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES update_plans(id) ON DELETE CASCADE,
    component TEXT NOT NULL,
    image_uri TEXT NOT NULL,
    version TEXT,
    checksum TEXT,
    size_bytes BIGINT,
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_artifacts_plan ON artifacts (plan_id);
CREATE INDEX idx_artifacts_component ON artifacts (component);
```

#### `host_runs`
Individual server update execution tracking with state machine.

```sql
CREATE TABLE host_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES update_plans(id) ON DELETE CASCADE,
    host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'pending',
    ctx JSONB NOT NULL DEFAULT '{}',
    attempts INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_host_runs_plan_host ON host_runs (plan_id, host_id);
CREATE INDEX idx_host_runs_state ON host_runs (state);
CREATE INDEX idx_host_runs_updated ON host_runs (updated_at);
```

**State Machine Values:**
- `pending`: Queued for execution
- `running`: Currently executing
- `completed`: Successfully completed
- `failed`: Failed with error
- `cancelled`: Manually cancelled
- `retrying`: Attempting retry

**Context JSONB Structure:**
```json
{
  "progress": {
    "phase": "download|install|reboot|verify",
    "percentage": 75,
    "message": "Installing firmware update..."
  },
  "results": {
    "firmwareVersion": "2.8.1",
    "updateDuration": 480,
    "rebootRequired": true,
    "errors": []
  },
  "timing": {
    "startTime": "2024-01-15T10:30:00Z",
    "endTime": "2024-01-15T10:38:00Z",
    "phases": {
      "download": 120,
      "install": 300,
      "reboot": 60
    }
  }
}
```

### Supporting Tables

#### `system_config`
Application-wide configuration settings.

```sql
CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Common Configuration Keys:**
- `setup_complete`: Initial setup completion status
- `maintenance_windows`: Global maintenance window definitions
- `notification_settings`: Alert and notification preferences
- `integration_settings`: vCenter and LDAP configuration

#### `system_events`
Comprehensive audit trail and event logging.

```sql
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    host_id UUID REFERENCES hosts(id),
    plan_id UUID REFERENCES update_plans(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for querying
CREATE INDEX idx_events_type ON system_events (event_type);
CREATE INDEX idx_events_severity ON system_events (severity);
CREATE INDEX idx_events_created ON system_events (created_at);
CREATE INDEX idx_events_user ON system_events (user_id);
```

**Event Types:**
- `update_started`, `update_completed`, `update_failed`
- `host_discovered`, `host_disconnected`, `host_reconnected`
- `maintenance_window_started`, `maintenance_window_ended`
- `user_login`, `user_logout`, `permission_changed`
- `system_error`, `integration_failure`, `configuration_changed`

#### `background_jobs`
Background job queue management and tracking.

```sql
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for job processing
CREATE INDEX idx_jobs_status ON background_jobs (status);
CREATE INDEX idx_jobs_scheduled ON background_jobs (scheduled_for);
CREATE INDEX idx_jobs_type ON background_jobs (job_type);
```

### Row Level Security (RLS) Policies

All tables implement comprehensive RLS policies for security:

```sql
-- Enable RLS on all tables
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_plans ENABLE ROW LEVEL SECURITY;
-- ... (all other tables)

-- Example policies for hosts table
CREATE POLICY "Users can view hosts they have access to"
ON hosts FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (
    -- Admin users can see all hosts
    auth.jwt() ->> 'role' = 'admin' OR
    -- Regular users can see hosts in their assigned datacenters
    EXISTS (
      SELECT 1 FROM user_datacenter_access 
      WHERE user_id = auth.uid() 
      AND datacenter_id = hosts.datacenter_id
    )
  )
);

CREATE POLICY "Admins can modify hosts"
ON hosts FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');
```

## Local API Database Schema

The local API maintains a synchronized subset of data for on-premise operations:

### Core Tables (Synchronized from Supabase)

```sql
-- Hosts table (same structure)
CREATE TABLE hosts (
    id UUID PRIMARY KEY,
    fqdn TEXT NOT NULL,
    mgmt_ip VARCHAR(45) NOT NULL,
    -- ... same fields as Supabase
    sync_version BIGINT DEFAULT 0,
    last_synced TIMESTAMPTZ DEFAULT now()
);

-- Credentials (vault paths only, actual credentials stored locally)
CREATE TABLE credentials (
    id UUID PRIMARY KEY,
    host_id UUID REFERENCES hosts(id),
    kind TEXT NOT NULL,
    username TEXT,
    password_hash TEXT, -- Local encrypted storage
    sync_version BIGINT DEFAULT 0
);
```

### Local-Only Tables

#### `task_queue`
Local job queue for background processing.

```sql
CREATE TABLE task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `redfish_sessions`
Active Redfish API session management.

```sql
CREATE TABLE redfish_sessions (
    host_id UUID PRIMARY KEY REFERENCES hosts(id),
    session_token TEXT NOT NULL,
    session_uri TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Database Functions

### State Machine Function
Ensures atomic state transitions with validation.

```sql
CREATE OR REPLACE FUNCTION set_host_run_state(
    p_id UUID, 
    p_from TEXT, 
    p_to TEXT, 
    p_ctx JSONB
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    UPDATE host_runs 
    SET 
        state = p_to,
        ctx = COALESCE(p_ctx, ctx),
        updated_at = now(),
        started_at = CASE WHEN p_to = 'running' THEN now() ELSE started_at END,
        completed_at = CASE WHEN p_to IN ('completed', 'failed', 'cancelled') THEN now() ELSE completed_at END
    WHERE id = p_id AND state = p_from;
    
    RETURN FOUND;
END$$;
```

### Automatic Timestamp Updates

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at columns
CREATE TRIGGER update_hosts_updated_at
    BEFORE UPDATE ON hosts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Data Synchronization

```sql
CREATE OR REPLACE FUNCTION sync_to_local_api(
    table_name TEXT,
    record_id UUID
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- Trigger webhook to local API for data sync
    PERFORM pg_notify('sync_update', json_build_object(
        'table', table_name,
        'id', record_id,
        'timestamp', extract(epoch from now())
    )::text);
END$$;
```

## Migration Strategy

### Version Control
All schema changes are managed through migration files:

```
api/db/migrations/
├── 000_init.sql           # Initial schema
├── 001_vcenters.sql       # vCenter integration tables
├── 002_system_config.sql  # Configuration management
├── 003_audit_logging.sql  # Enhanced audit trails
└── 004_performance.sql    # Performance optimizations
```

### Data Migration
For major schema changes, migration scripts handle data transformation:

```sql
-- Example migration script
BEGIN;

-- Add new column
ALTER TABLE hosts ADD COLUMN datacenter_id UUID;

-- Populate from existing data
UPDATE hosts 
SET datacenter_id = (
    SELECT id FROM datacenters 
    WHERE name = hosts.tags[1]
) WHERE array_length(tags, 1) > 0;

-- Add constraint after population
ALTER TABLE hosts 
ADD CONSTRAINT fk_hosts_datacenter 
FOREIGN KEY (datacenter_id) REFERENCES datacenters(id);

COMMIT;
```

## Performance Considerations

### Indexing Strategy
- **Primary Keys**: All UUID primary keys with btree indexes
- **Foreign Keys**: All foreign key relationships indexed
- **Query Patterns**: Indexes optimized for common query patterns
- **Composite Indexes**: Multi-column indexes for complex queries

### Query Optimization
- **Connection Pooling**: PgBouncer for connection management
- **Query Caching**: Redis for frequently accessed data
- **Materialized Views**: Pre-computed aggregations for dashboards
- **Partitioning**: Time-based partitioning for large audit tables

### Backup & Recovery
- **Continuous Backup**: Point-in-time recovery capability
- **Cross-Region Replication**: Geographic redundancy
- **Automated Testing**: Regular backup restoration testing
- **Data Retention**: Configurable retention policies for audit data