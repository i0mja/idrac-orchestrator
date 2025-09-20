import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ComplianceReport {
  id: string;
  organization_id: string;
  report_type: string;
  report_data: any;
  generated_by?: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  status: string;
}

export interface GovernancePolicy {
  id: string;
  organization_id: string;
  policy_type: string;
  policy_name: string;
  policy_rules: any;
  enforcement_level: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export function useCompliance() {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [policies, setPolicies] = useState<GovernancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [reportsData, policiesData] = await Promise.all([
        supabase.from('compliance_reports').select('*').order('generated_at', { ascending: false }),
        supabase.from('governance_policies').select('*').order('created_at', { ascending: false })
      ]);

      setReports(reportsData.data || []);
      setPolicies(policiesData.data || []);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateComplianceReport = async (
    reportType: string,
    periodStart: string,
    periodEnd: string
  ) => {
    try {
      // Get current organization ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }

      // In a real implementation, this would gather compliance data
      const reportData = await gatherComplianceData(reportType as any, periodStart, periodEnd);
      
      const { data, error } = await supabase
        .from('compliance_reports')
        .insert({
          organization_id: profile.organization_id,
          report_type: reportType,
          report_data: reportData,
          period_start: periodStart,
          period_end: periodEnd,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      setReports(prev => [data, ...prev]);
      toast({
        title: "Report Generated",
        description: `${reportType.toUpperCase()} compliance report has been generated.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Report Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const gatherComplianceData = async (
    reportType: string,
    periodStart: string,
    periodEnd: string
  ) => {
    // This would gather actual compliance data based on the report type
    const baseData = {
      period: { start: periodStart, end: periodEnd },
      generated_at: new Date().toISOString(),
      summary: {}
    };

    switch (reportType) {
      case 'soc2':
        return {
          ...baseData,
          controls: {
            security: { status: 'compliant', evidence_count: 15 },
            availability: { status: 'compliant', evidence_count: 12 },
            processing_integrity: { status: 'compliant', evidence_count: 8 },
            confidentiality: { status: 'compliant', evidence_count: 10 },
            privacy: { status: 'compliant', evidence_count: 7 }
          },
          audit_logs_count: 1250,
          security_incidents: 0,
          access_reviews_completed: 4
        };

      case 'gdpr':
        return {
          ...baseData,
          data_processing: {
            lawful_basis_documented: true,
            consent_records: 150,
            data_subject_requests: 5,
            data_breaches: 0
          },
          privacy_measures: {
            privacy_by_design: true,
            dpia_completed: 2,
            data_retention_policies: true
          }
        };

      case 'hipaa':
        return {
          ...baseData,
          safeguards: {
            administrative: { status: 'compliant', policies_count: 12 },
            physical: { status: 'compliant', controls_count: 8 },
            technical: { status: 'compliant', controls_count: 15 }
          },
          phi_access_logs: 450,
          security_risk_assessments: 1,
          workforce_training_completed: true
        };

      case 'pci':
        return {
          ...baseData,
          requirements: {
            firewall_config: { status: 'compliant' },
            default_passwords: { status: 'compliant' },
            cardholder_data_protection: { status: 'compliant' },
            encrypted_transmission: { status: 'compliant' },
            antivirus: { status: 'compliant' },
            secure_systems: { status: 'compliant' },
            access_control: { status: 'compliant' },
            unique_ids: { status: 'compliant' },
            physical_access: { status: 'compliant' },
            network_monitoring: { status: 'compliant' },
            vulnerability_testing: { status: 'compliant' },
            information_security_policy: { status: 'compliant' }
          },
          vulnerability_scans: 4,
          penetration_tests: 1
        };

      default:
        return baseData;
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .update({ status })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      setReports(prev => prev.map(r => r.id === reportId ? data : r));
      toast({
        title: "Report Status Updated",
        description: `Report status has been changed to ${status}.`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('compliance_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.filter(r => r.id !== reportId));
      toast({
        title: "Report Deleted",
        description: "Compliance report has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createGovernancePolicy = async (policy: Omit<GovernancePolicy, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('governance_policies')
        .insert(policy)
        .select()
        .single();

      if (error) throw error;

      setPolicies(prev => [data, ...prev]);
      toast({
        title: "Policy Created",
        description: `Governance policy "${policy.policy_name}" has been created.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Policy Creation Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateGovernancePolicy = async (policyId: string, updates: Partial<GovernancePolicy>) => {
    try {
      const { data, error } = await supabase
        .from('governance_policies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', policyId)
        .select()
        .single();

      if (error) throw error;

      setPolicies(prev => prev.map(p => p.id === policyId ? data : p));
      toast({
        title: "Policy Updated",
        description: "Governance policy has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteGovernancePolicy = async (policyId: string) => {
    try {
      const { error } = await supabase
        .from('governance_policies')
        .delete()
        .eq('id', policyId);

      if (error) throw error;

      setPolicies(prev => prev.filter(p => p.id !== policyId));
      toast({
        title: "Policy Deleted",
        description: "Governance policy has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportReport = async (reportId: string, format: 'pdf' | 'excel' | 'json' = 'pdf') => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) throw new Error('Report not found');

      // In a real implementation, this would generate and download the report
      const dataStr = JSON.stringify(report.report_data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.report_type}_report_${report.period_start}_${report.period_end}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: `${report.report_type.toUpperCase()} report has been exported successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getComplianceOverview = () => {
    const reportsByType = reports.reduce((acc, report) => {
      acc[report.report_type] = (acc[report.report_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activePolicies = policies.filter(p => p.is_active).length;
    const recentReports = reports.filter(r => {
      const reportDate = new Date(r.generated_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return reportDate >= thirtyDaysAgo;
    }).length;

    return {
      totalReports: reports.length,
      recentReports,
      activePolicies,
      reportsByType,
      lastReportDate: reports[0]?.generated_at || null
    };
  };

  return {
    reports,
    policies,
    loading,
    generateComplianceReport,
    updateReportStatus,
    deleteReport,
    createGovernancePolicy,
    updateGovernancePolicy,
    deleteGovernancePolicy,
    exportReport,
    getComplianceOverview,
    refresh: fetchData
  };
}