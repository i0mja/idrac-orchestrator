-- Enhanced User Management and RBAC System

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
  expires_at TIMESTAMPTZ NOT NULL,
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
  trigger_type VARCHAR(100) NOT NULL, -- 'schedule', 'event', 'manual'
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
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
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
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recommendations JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
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

-- Create RLS policies

-- User permissions - only admins and the user themselves can see permissions
CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage permissions"
  ON user_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Audit logs - only admins can read, system can insert
CREATE POLICY "Only admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- User sessions - users can view their own sessions, admins can view all
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Analytics events - authenticated users can insert, admins can view all
CREATE POLICY "Users can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all analytics"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Workflow templates - all authenticated users can view, admins can manage
CREATE POLICY "Users can view active workflows"
  ON workflow_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage workflows"
  ON workflow_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Workflow executions - users can view, admins can manage
CREATE POLICY "Users can view workflow executions"
  ON workflow_executions FOR SELECT
  USING (auth.role() = 'authenticated');

-- System insights - all authenticated users can view
CREATE POLICY "Users can view system insights"
  ON system_insights FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can acknowledge insights"
  ON system_insights FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (
    acknowledged_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, last_activity);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_workflow_executions_template_id ON workflow_executions(template_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_system_insights_type ON system_insights(insight_type);
CREATE INDEX idx_system_insights_severity ON system_insights(severity);

-- Create helper functions

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, perm app_permission)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN profiles p ON p.id = up.user_id
    WHERE p.user_id = user_uuid
    AND up.permission = perm
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = user_uuid AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_resource_type VARCHAR(50) DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, 
    ip_address, user_agent, success, error_message, metadata
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id,
    p_ip_address, p_user_agent, p_success, p_error_message, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track analytics events
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_event_type VARCHAR(100),
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_properties JSONB DEFAULT '{}',
  p_server_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    event_type, user_id, session_id, properties,
    server_id, campaign_id
  ) VALUES (
    p_event_type, p_user_id, p_session_id, p_properties,
    p_server_id, p_campaign_id
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default workflow templates
INSERT INTO workflow_templates (name, description, category, trigger_type, trigger_config, steps, created_by) VALUES
('Security Patch Deployment', 'Automated deployment of critical security patches', 'security', 'event', 
 '{"event_type": "security_alert", "severity": "critical"}',
 '[
   {"type": "notify", "config": {"channels": ["email", "slack"], "message": "Critical security patch deployment initiated"}},
   {"type": "backup", "config": {"scope": "affected_servers"}},
   {"type": "deploy_patches", "config": {"priority": "critical", "rollback_on_failure": true}},
   {"type": "verify", "config": {"health_checks": true, "timeout_minutes": 30}},
   {"type": "notify", "config": {"channels": ["email", "slack"], "message": "Security patch deployment completed"}}
 ]',
 (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
 
('Monthly Maintenance', 'Automated monthly maintenance routine', 'maintenance', 'schedule',
 '{"cron": "0 2 1 * *", "timezone": "UTC"}',
 '[
   {"type": "notify", "config": {"channels": ["email"], "message": "Monthly maintenance starting"}},
   {"type": "health_check", "config": {"all_servers": true}},
   {"type": "update_firmware", "config": {"only_recommended": true}},
   {"type": "cleanup", "config": {"logs": true, "temp_files": true}},
   {"type": "generate_report", "config": {"type": "monthly_summary"}},
   {"type": "notify", "config": {"channels": ["email"], "message": "Monthly maintenance completed"}}
 ]',
 (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),

('Server Health Alert', 'Automated response to server health issues', 'monitoring', 'event',
 '{"event_type": "health_alert", "severity": ["warning", "critical"]}',
 '[
   {"type": "diagnose", "config": {"run_health_checks": true}},
   {"type": "notify", "config": {"channels": ["email", "sms"], "message": "Server health issue detected"}},
   {"type": "auto_remediate", "config": {"safe_actions_only": true}},
   {"type": "escalate", "config": {"if_unresolved": true, "timeout_minutes": 15}}
 ]',
 (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));

-- Insert default system insights
INSERT INTO system_insights (insight_type, severity, title, description, recommendations, confidence_score, affected_resources) VALUES
('performance', 'warning', 'Server Performance Degradation Detected', 
 'Multiple servers showing decreased performance metrics over the past 7 days',
 '["Review server resource utilization", "Consider scaling up affected servers", "Check for memory leaks"]',
 0.85, '{"servers": [], "datacenters": []}'),
 
('security', 'critical', 'End-of-Life Operating Systems Found',
 'Several servers are running operating systems that are no longer supported',
 '["Upgrade to supported OS versions", "Implement additional security monitoring", "Consider server replacement"]',
 0.95, '{"servers": [], "os_versions": []}'),

('cost', 'info', 'Resource Optimization Opportunity',
 'Analysis shows potential for 15% cost reduction through resource optimization',
 '["Consolidate underutilized servers", "Review firmware update schedules", "Optimize maintenance windows"]',
 0.78, '{"estimated_savings": "$2,500/month"});