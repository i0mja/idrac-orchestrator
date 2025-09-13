-- Add campaign approval workflow and templates
ALTER TABLE update_orchestration_plans 
ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by text,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_comments text,
ADD COLUMN IF NOT EXISTS template_id uuid,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS estimated_duration interval,
ADD COLUMN IF NOT EXISTS actual_duration interval,
ADD COLUMN IF NOT EXISTS failure_reason text,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3;

-- Create campaign templates table
CREATE TABLE IF NOT EXISTS campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL,
  category text DEFAULT 'general',
  is_system_template boolean DEFAULT false,
  created_by text DEFAULT (auth.uid())::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  usage_count integer DEFAULT 0
);

-- Enable RLS on campaign templates
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign templates
CREATE POLICY "Allow authenticated access to campaign templates" 
ON campaign_templates FOR ALL 
TO authenticated 
USING (true);

-- Create campaign approvals table for approval history
CREATE TABLE IF NOT EXISTS campaign_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES update_orchestration_plans(id) ON DELETE CASCADE,
  approver_id text NOT NULL,
  approver_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  comments text,
  approval_level integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on campaign approvals
ALTER TABLE campaign_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign approvals
CREATE POLICY "Allow authenticated access to campaign approvals" 
ON campaign_approvals FOR ALL 
TO authenticated 
USING (true);

-- Create campaign execution logs table
CREATE TABLE IF NOT EXISTS campaign_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES update_orchestration_plans(id) ON DELETE CASCADE,
  server_id uuid,
  log_level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on campaign execution logs
ALTER TABLE campaign_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign execution logs
CREATE POLICY "Allow authenticated access to campaign execution logs" 
ON campaign_execution_logs FOR ALL 
TO authenticated 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_templates_category ON campaign_templates(category);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_created_by ON campaign_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_campaign_approvals_campaign_id ON campaign_approvals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_approvals_status ON campaign_approvals(status);
CREATE INDEX IF NOT EXISTS idx_campaign_execution_logs_campaign_id ON campaign_execution_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_execution_logs_server_id ON campaign_execution_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_update_orchestration_plans_status ON update_orchestration_plans(status);
CREATE INDEX IF NOT EXISTS idx_update_orchestration_plans_created_by ON update_orchestration_plans(created_by);

-- Add trigger to update template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE campaign_templates 
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_template_usage
AFTER INSERT ON update_orchestration_plans
FOR EACH ROW
EXECUTE FUNCTION increment_template_usage();

-- Add trigger to calculate actual duration
CREATE OR REPLACE FUNCTION calculate_campaign_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.started_at IS NOT NULL THEN
    NEW.actual_duration = NEW.completed_at - NEW.started_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_campaign_duration
BEFORE UPDATE ON update_orchestration_plans
FOR EACH ROW
EXECUTE FUNCTION calculate_campaign_duration();