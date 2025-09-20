-- RLS Policies for multi-tenancy and enterprise features

-- Helper function to get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Helper function to check if user is admin in their organization  
CREATE OR REPLACE FUNCTION public.is_organization_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.profiles p ON p.id = om.user_id
    WHERE p.user_id = auth.uid() 
    AND om.role IN ('admin', 'owner')
    AND om.is_active = true
  );
$$;

-- Organizations policies
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (id = public.get_user_organization_id());

CREATE POLICY "Organization admins can update their organization"
ON public.organizations FOR UPDATE
USING (id = public.get_user_organization_id() AND public.is_organization_admin());

-- Organization members policies
CREATE POLICY "Users can view organization members"
ON public.organization_members FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Organization admins can manage members"
ON public.organization_members FOR ALL
USING (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

-- SSO providers policies
CREATE POLICY "Organization admins can manage SSO providers"
ON public.sso_providers FOR ALL
USING (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

CREATE POLICY "Users can view SSO providers"
ON public.sso_providers FOR SELECT
USING (organization_id = public.get_user_organization_id());

-- API keys policies
CREATE POLICY "Organization admins can manage API keys"
ON public.api_keys FOR ALL  
USING (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

-- Compliance reports policies
CREATE POLICY "Organization members can view compliance reports"
ON public.compliance_reports FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Organization admins can manage compliance reports"
ON public.compliance_reports FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

CREATE POLICY "Organization admins can update compliance reports"
ON public.compliance_reports FOR UPDATE
USING (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

-- Notification channels policies
CREATE POLICY "Organization members can view notification channels"
ON public.notification_channels FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Organization admins can manage notification channels"
ON public.notification_channels FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

CREATE POLICY "Organization admins can update notification channels"
ON public.notification_channels FOR UPDATE
USING (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

CREATE POLICY "Organization admins can delete notification channels"
ON public.notification_channels FOR DELETE
USING (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

-- Governance policies policies
CREATE POLICY "Organization members can view governance policies"
ON public.governance_policies FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Organization admins can manage governance policies"
ON public.governance_policies FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

CREATE POLICY "Organization admins can update governance policies"
ON public.governance_policies FOR UPDATE
USING (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

CREATE POLICY "Organization admins can delete governance policies"
ON public.governance_policies FOR DELETE
USING (organization_id = public.get_user_organization_id() AND public.is_organization_admin());

-- Update existing table policies to include organization context
-- Update workflow templates policies
DROP POLICY IF EXISTS "Users can view active workflows" ON public.workflow_templates;
DROP POLICY IF EXISTS "Admins can manage workflows" ON public.workflow_templates;

CREATE POLICY "Users can view organization workflow templates"
ON public.workflow_templates FOR SELECT  
USING (organization_id = public.get_user_organization_id() OR organization_id IS NULL);

CREATE POLICY "Organization admins can manage workflow templates"
ON public.workflow_templates FOR ALL
USING (public.is_organization_admin() AND (organization_id = public.get_user_organization_id() OR organization_id IS NULL));

-- Update workflow executions policies  
DROP POLICY IF EXISTS "Users can view workflow executions" ON public.workflow_executions;

CREATE POLICY "Users can view organization workflow executions"
ON public.workflow_executions FOR SELECT
USING (organization_id = public.get_user_organization_id() OR organization_id IS NULL);

CREATE POLICY "System can insert workflow executions"
ON public.workflow_executions FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update workflow executions" 
ON public.workflow_executions FOR UPDATE
USING (true);