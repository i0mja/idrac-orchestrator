-- Multi-tenancy and advanced enterprise features

-- Organizations/Tenants table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  domain VARCHAR(255),
  logo_url TEXT,
  subscription_tier VARCHAR(50) DEFAULT 'enterprise',
  max_users INTEGER DEFAULT 1000,
  max_servers INTEGER DEFAULT 10000,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Organization members (replaces some profile functionality)
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,  
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  permissions JSONB DEFAULT '[]',
  invited_by UUID,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, user_id)
);

-- SSO Providers
CREATE TABLE public.sso_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_type VARCHAR(50) NOT NULL, -- 'saml', 'oidc', 'ldap'
  provider_name VARCHAR(255) NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- API Keys for advanced integrations
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  permissions JSONB DEFAULT '[]',
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Compliance and audit trails
CREATE TABLE public.compliance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type VARCHAR(100) NOT NULL, -- 'soc2', 'gdpr', 'hipaa', 'pci'
  report_data JSONB NOT NULL,
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  period_start DATE NOT NULL,  
  period_end DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' -- 'draft', 'final', 'submitted'
);

-- Advanced notifications and alerting
CREATE TABLE public.notification_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel_type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'teams', 'webhook', 'pagerduty'
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enterprise policies and governance
CREATE TABLE public.governance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_type VARCHAR(100) NOT NULL, -- 'update_approval', 'security', 'compliance', 'access'
  policy_name VARCHAR(255) NOT NULL,
  policy_rules JSONB NOT NULL DEFAULT '{}',
  enforcement_level VARCHAR(50) DEFAULT 'warn', -- 'enforce', 'warn', 'audit'
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_policies ENABLE ROW LEVEL SECURITY;

-- Update existing tables to include organization_id for multi-tenancy
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.servers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.workflow_templates ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.workflow_executions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Indexes for performance
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_sso_providers_org_id ON public.sso_providers(organization_id);
CREATE INDEX idx_api_keys_org_id ON public.api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_compliance_reports_org_id ON public.compliance_reports(organization_id);
CREATE INDEX idx_notification_channels_org_id ON public.notification_channels(organization_id);
CREATE INDEX idx_governance_policies_org_id ON public.governance_policies(organization_id);
CREATE INDEX idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX idx_servers_org_id ON public.servers(organization_id);
CREATE INDEX idx_workflow_templates_org_id ON public.workflow_templates(organization_id);
CREATE INDEX idx_workflow_executions_org_id ON public.workflow_executions(organization_id);