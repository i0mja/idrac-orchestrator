import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ComplianceRule {
  id: string;
  name: string;
  category: 'security' | 'availability' | 'performance' | 'lifecycle' | 'governance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  conditions: {
    metric: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }[];
  actions: {
    type: 'alert' | 'block' | 'quarantine' | 'auto_remediate';
    parameters: Record<string, any>;
  }[];
  isActive: boolean;
}

interface ComplianceViolation {
  id: string;
  ruleId: string;
  serverId: string;
  serverName: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  status: 'open' | 'investigating' | 'remediated' | 'accepted_risk';
  remediationSteps: string[];
  assignedTo?: string;
  dueDate?: string;
}

interface ComplianceMetrics {
  overallScore: number;
  categoryScores: Record<string, number>;
  totalViolations: number;
  criticalViolations: number;
  trendsData: Array<{
    date: string;
    score: number;
    violations: number;
  }>;
}

export function useAutomatedCompliance() {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const { toast } = useToast();

  const runComplianceCheck = useCallback(async (serverIds?: string[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('automated-compliance-check', {
        body: { 
          serverIds: serverIds || [],
          includeRemediation: true,
          generateReport: true
        }
      });

      if (error) throw error;

      setViolations(data.violations || []);
      setMetrics(data.metrics || null);
      
      toast({
        title: "Compliance Check Complete",
        description: `Found ${data.violations?.length || 0} violations across ${serverIds?.length || 'all'} servers`
      });

      return data;
    } catch (error) {
      console.error('Compliance check failed:', error);
      toast({
        title: "Compliance Check Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createComplianceRule = useCallback(async (rule: Omit<ComplianceRule, 'id'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-compliance-rules', {
        body: { 
          action: 'create',
          rule
        }
      });

      if (error) throw error;

      const newRule = { ...rule, id: data.ruleId };
      setRules(prev => [...prev, newRule]);
      
      toast({
        title: "Compliance Rule Created",
        description: `Rule "${rule.name}" has been activated`
      });

      return data.ruleId;
    } catch (error) {
      console.error('Rule creation failed:', error);
      toast({
        title: "Rule Creation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateComplianceRule = useCallback(async (ruleId: string, updates: Partial<ComplianceRule>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-compliance-rules', {
        body: { 
          action: 'update',
          ruleId,
          updates
        }
      });

      if (error) throw error;

      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ));
      
      toast({
        title: "Rule Updated",
        description: "Compliance rule has been updated successfully"
      });

      return data;
    } catch (error) {
      console.error('Rule update failed:', error);
      toast({
        title: "Rule Update Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const remediateViolation = useCallback(async (
    violationId: string, 
    action: 'auto_remediate' | 'manual_fix' | 'accept_risk',
    details?: Record<string, any>
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('remediate-compliance-violation', {
        body: { 
          violationId,
          action,
          details: details || {}
        }
      });

      if (error) throw error;

      setViolations(prev => prev.map(violation => 
        violation.id === violationId 
          ? { ...violation, status: action === 'accept_risk' ? 'accepted_risk' : 'remediated' }
          : violation
      ));
      
      toast({
        title: "Violation Remediated",
        description: `Compliance violation has been ${action === 'accept_risk' ? 'accepted as risk' : 'remediated'}`
      });

      return data;
    } catch (error) {
      console.error('Remediation failed:', error);
      toast({
        title: "Remediation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const generateComplianceReport = useCallback(async (
    reportType: 'summary' | 'detailed' | 'executive',
    timeRange?: { start: string; end: string }
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-compliance-report', {
        body: { 
          reportType,
          timeRange: timeRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Report Generated",
        description: `${reportType} compliance report has been generated`
      });

      return data.report;
    } catch (error) {
      console.error('Report generation failed:', error);
      toast({
        title: "Report Generation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchComplianceRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('governance_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform governance policies to compliance rules format
      const transformedRules = data?.map(policy => {
        const policyRules = policy.policy_rules as any;
        return {
          id: policy.id,
          name: policy.policy_name,
          category: policy.policy_type as ComplianceRule['category'],
          severity: policy.enforcement_level === 'block' ? 'critical' : 'medium' as ComplianceRule['severity'],
          description: `Governance policy: ${policy.policy_name}`,
          conditions: (policyRules && Array.isArray(policyRules.conditions)) ? policyRules.conditions : [],
          actions: (policyRules && Array.isArray(policyRules.actions)) ? policyRules.actions : [],
          isActive: policy.is_active || false
        };
      }) || [];

      setRules(transformedRules);
    } catch (error) {
      console.error('Failed to fetch compliance rules:', error);
    }
  }, []);

  const fetchViolations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('eol_alerts')
        .select('*, servers(hostname)')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform alerts to violations format
      const transformedViolations = data?.map(alert => ({
        id: alert.id,
        ruleId: 'eol-policy',
        serverId: alert.server_id || '',
        serverName: (alert.servers as any)?.hostname || 'Unknown',
        violationType: alert.alert_type,
        severity: alert.severity as ComplianceViolation['severity'],
        description: alert.message,
        detectedAt: alert.created_at,
        status: 'open' as const,
        remediationSteps: [alert.recommendation || 'Review and take appropriate action']
      })) || [];

      setViolations(transformedViolations);
    } catch (error) {
      console.error('Failed to fetch violations:', error);
    }
  }, []);

  useEffect(() => {
    fetchComplianceRules();
    fetchViolations();
  }, [fetchComplianceRules, fetchViolations]);

  return {
    loading,
    rules,
    violations,
    metrics,
    runComplianceCheck,
    createComplianceRule,
    updateComplianceRule,
    remediateViolation,
    generateComplianceReport,
    refreshData: () => {
      fetchComplianceRules();
      fetchViolations();
    }
  };
}