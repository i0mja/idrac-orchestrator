-- Add RLS Policies and Functions - Part 2

-- Create RLS policies for user_permissions
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

-- Create RLS policies for audit_logs
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

-- Create RLS policies for user_sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Create RLS policies for analytics_events
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

-- Create RLS policies for workflow_templates
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

-- Create RLS policies for workflow_executions
CREATE POLICY "Users can view workflow executions"
  ON workflow_executions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create RLS policies for system_insights
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