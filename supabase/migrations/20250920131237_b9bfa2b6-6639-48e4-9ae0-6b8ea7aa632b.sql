-- Enhanced User Management and RBAC System - Part 1: Tables and Types

-- Create app_permissions enum for granular permissions
CREATE TYPE app_permission AS ENUM (
  'system:admin',
  'users:read', 'users:write', 'users:delete',
  'servers:read', 'servers:write', 'servers:delete',
  'firmware:read', 'firmware:write', 'firmware:deploy',
  'jobs:read', 'jobs:write', 'jobs:execute', 'jobs:cancel',
  'alerts:read', 'alerts:acknowledge', 'alerts:manage',
  'settings:read', 'settings:write',
  'analytics:read', 'analytics:export',
  'backup:read', 'backup:write', 'backup:restore',
  'audit:read'
);

-- Create user_permissions table for granular RBAC
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission app_permission NOT NULL,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission)
);

-- Create audit_logs table for security monitoring
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_sessions for enhanced session management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create analytics_events for advanced analytics
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  session_id UUID REFERENCES user_sessions(id),
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now(),
  server_id UUID,
  campaign_id UUID
);

-- Create workflow_templates for intelligent automation
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'general',
  trigger_type VARCHAR(100) NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  steps JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create workflow_executions for tracking automation runs
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_log JSONB DEFAULT '[]',
  triggered_by UUID REFERENCES profiles(id),
  context JSONB DEFAULT '{}'
);

-- Create system_insights for predictive analytics
CREATE TABLE system_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recommendations JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2),
  affected_resources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Enable RLS on all new tables
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_insights ENABLE ROW LEVEL SECURITY;