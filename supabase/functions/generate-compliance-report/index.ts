import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportRequest {
  reportType: 'summary' | 'detailed' | 'executive';
  timeRange: {
    start: string;
    end: string;
  };
  includeCharts?: boolean;
  formatType?: 'json' | 'pdf' | 'csv';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      reportType,
      timeRange,
      includeCharts = true,
      formatType = 'json'
    }: ReportRequest = await req.json();

    console.log(`Generating ${reportType} compliance report for ${timeRange.start} to ${timeRange.end}`);

    // Generate report based on type
    let report;
    switch (reportType) {
      case 'executive':
        report = await generateExecutiveReport(supabase, timeRange);
        break;
      case 'detailed':
        report = await generateDetailedReport(supabase, timeRange);
        break;
      case 'summary':
      default:
        report = await generateSummaryReport(supabase, timeRange);
        break;
    }

    // Store report in compliance_reports table
    const { data: reportRecord, error: reportError } = await supabase
      .from('compliance_reports')
      .insert({
        organization_id: '00000000-0000-0000-0000-000000000000', // Default org
        report_type: reportType,
        period_start: timeRange.start.split('T')[0],
        period_end: timeRange.end.split('T')[0],
        report_data: report,
        status: 'completed'
      })
      .select()
      .single();

    if (reportError) console.warn('Failed to store report:', reportError);

    // Log report generation
    await supabase.from('operational_events').insert({
      event_type: 'compliance_report',
      event_source: 'compliance_reporting_system',
      title: `${reportType} compliance report generated`,
      description: `Generated ${reportType} report for period ${timeRange.start} to ${timeRange.end}`,
      status: 'completed',
      severity: 'info',
      metadata: {
        reportType,
        timeRange,
        reportId: reportRecord?.id
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        report,
        reportId: reportRecord?.id,
        metadata: {
          reportType,
          timeRange,
          generatedAt: new Date().toISOString(),
          formatType
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Compliance report generation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function generateExecutiveReport(supabase: any, timeRange: any) {
  // Fetch high-level metrics for executive summary
  const { data: servers } = await supabase
    .from('servers')
    .select('id, hostname, created_at, os_eol_date')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end);

  const { data: policies } = await supabase
    .from('governance_policies')
    .select('id, policy_name, policy_type, enforcement_level, is_active');

  const { data: violations } = await supabase
    .from('eol_alerts')
    .select('severity, alert_type, created_at')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end);

  // Calculate key metrics
  const totalServers = servers?.length || 0;
  const activePolicies = policies?.filter(p => p.is_active)?.length || 0;
  const criticalViolations = violations?.filter(v => v.severity === 'critical')?.length || 0;
  
  const complianceScore = Math.max(0, 100 - (criticalViolations * 10));

  return {
    executiveSummary: {
      reportPeriod: timeRange,
      overallCompliance: `${complianceScore}%`,
      keyFindings: [
        `${totalServers} servers monitored during this period`,
        `${activePolicies} active governance policies enforced`,
        `${criticalViolations} critical compliance violations detected`,
        complianceScore > 90 ? 'Strong compliance posture maintained' : 
        complianceScore > 75 ? 'Good compliance with room for improvement' :
        'Compliance needs immediate attention'
      ],
      riskAssessment: criticalViolations > 5 ? 'High' : criticalViolations > 2 ? 'Medium' : 'Low',
      recommendations: generateExecutiveRecommendations(complianceScore, criticalViolations, totalServers)
    },
    metrics: {
      complianceScore,
      totalServers,
      activePolicies,
      violations: {
        critical: criticalViolations,
        total: violations?.length || 0
      }
    },
    trends: {
      complianceTrend: 'stable', // Would calculate from historical data
      violationTrend: criticalViolations > 0 ? 'increasing' : 'stable'
    }
  };
}

async function generateDetailedReport(supabase: any, timeRange: any) {
  // Comprehensive data collection
  const { data: servers } = await supabase
    .from('servers')
    .select(`
      *,
      server_readiness_checks(*),
      virtual_machines(*)
    `);

  const { data: policies } = await supabase
    .from('governance_policies')
    .select('*');

  const { data: violations } = await supabase
    .from('eol_alerts')
    .select('*')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end);

  const { data: events } = await supabase
    .from('operational_events')
    .select('*')
    .in('event_type', ['compliance_check', 'policy_evaluation'])
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end);

  // Detailed analysis by category
  const securityCompliance = analyzeSecurityCompliance(servers, violations);
  const lifecycleCompliance = analyzeLifecycleCompliance(servers, violations);
  const governanceCompliance = analyzeGovernanceCompliance(policies, events);

  return {
    reportSummary: {
      period: timeRange,
      scope: `${servers?.length || 0} servers, ${policies?.length || 0} policies`,
      generatedAt: new Date().toISOString()
    },
    complianceByCategory: {
      security: securityCompliance,
      lifecycle: lifecycleCompliance,
      governance: governanceCompliance
    },
    detailedFindings: {
      criticalIssues: violations?.filter(v => v.severity === 'critical') || [],
      policyViolations: violations?.filter(v => v.alert_type === 'policy_violation') || [],
      systemEvents: events || []
    },
    serverAnalysis: servers?.map(server => analyzeServerCompliance(server, violations)) || [],
    policyEffectiveness: policies?.map(policy => analyzePolicyEffectiveness(policy, events)) || [],
    recommendations: generateDetailedRecommendations(servers, violations, policies)
  };
}

async function generateSummaryReport(supabase: any, timeRange: any) {
  // Essential metrics and findings
  const { data: violations } = await supabase
    .from('eol_alerts')
    .select('severity, alert_type, server_id, created_at')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end);

  const { data: servers } = await supabase
    .from('servers')
    .select('id, hostname, os_eol_date')
    .limit(100);

  const violationsByType = groupViolationsByType(violations || []);
  const serverComplianceStatus = calculateServerComplianceStatus(servers || [], violations || []);

  return {
    summary: {
      reportPeriod: timeRange,
      totalViolations: violations?.length || 0,
      serversAssessed: servers?.length || 0,
      complianceScore: Math.max(0, 100 - ((violations?.filter(v => v.severity === 'critical')?.length || 0) * 15))
    },
    violationBreakdown: violationsByType,
    complianceStatus: serverComplianceStatus,
    topIssues: identifyTopIssues(violations || []),
    actionItems: generateActionItems(violations || [])
  };
}

function generateExecutiveRecommendations(score: number, criticalViolations: number, totalServers: number): string[] {
  const recommendations = [];
  
  if (score < 75) {
    recommendations.push('Immediate focus on critical compliance violations required');
    recommendations.push('Consider increasing compliance monitoring frequency');
  }
  
  if (criticalViolations > 0) {
    recommendations.push('Implement automated remediation for critical security issues');
    recommendations.push('Review and update security policies');
  }
  
  if (totalServers > 100) {
    recommendations.push('Consider implementing automated compliance checking at scale');
  }
  
  recommendations.push('Regular compliance training for operations team');
  recommendations.push('Quarterly compliance review meetings with stakeholders');
  
  return recommendations;
}

function analyzeSecurityCompliance(servers: any[], violations: any[]) {
  const securityViolations = violations.filter(v => 
    v.alert_type.includes('security') || v.alert_type.includes('credential')
  );
  
  return {
    score: Math.max(0, 100 - (securityViolations.length * 10)),
    violations: securityViolations.length,
    issues: securityViolations.map(v => ({
      type: v.alert_type,
      severity: v.severity,
      description: v.message
    }))
  };
}

function analyzeLifecycleCompliance(servers: any[], violations: any[]) {
  const eolViolations = violations.filter(v => v.alert_type === 'os_eol');
  const outdatedServers = servers.filter(s => 
    s.os_eol_date && new Date(s.os_eol_date) <= new Date()
  );
  
  return {
    score: Math.max(0, 100 - (eolViolations.length * 15)),
    eolServers: outdatedServers.length,
    violations: eolViolations.length,
    upcomingEol: servers.filter(s => 
      s.os_eol_date && 
      new Date(s.os_eol_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    ).length
  };
}

function analyzeGovernanceCompliance(policies: any[], events: any[]) {
  const activePolicies = policies.filter(p => p.is_active);
  const policyEvaluations = events.filter(e => e.event_type === 'policy_evaluation');
  
  return {
    score: activePolicies.length > 0 ? 85 : 60, // Base score if policies exist
    activePolicies: activePolicies.length,
    totalPolicies: policies.length,
    evaluations: policyEvaluations.length,
    enforcementLevels: {
      block: policies.filter(p => p.enforcement_level === 'block').length,
      warn: policies.filter(p => p.enforcement_level === 'warn').length,
      monitor: policies.filter(p => p.enforcement_level === 'monitor').length
    }
  };
}

function analyzeServerCompliance(server: any, violations: any[]) {
  const serverViolations = violations.filter(v => v.server_id === server.id);
  
  return {
    serverId: server.id,
    hostname: server.hostname || server.id,
    violations: serverViolations.length,
    complianceScore: Math.max(0, 100 - (serverViolations.length * 10)),
    criticalIssues: serverViolations.filter(v => v.severity === 'critical').length,
    status: serverViolations.length === 0 ? 'compliant' : 
            serverViolations.some(v => v.severity === 'critical') ? 'critical' : 'warning'
  };
}

function analyzePolicyEffectiveness(policy: any, events: any[]) {
  const policyEvents = events.filter(e => 
    e.metadata && e.metadata.policyId === policy.id
  );
  
  return {
    policyId: policy.id,
    policyName: policy.policy_name,
    type: policy.policy_type,
    enforcementLevel: policy.enforcement_level,
    evaluations: policyEvents.length,
    effectiveness: policyEvents.length > 0 ? 'active' : 'inactive',
    violations: policyEvents.filter(e => e.severity !== 'info').length
  };
}

function groupViolationsByType(violations: any[]) {
  const grouped = violations.reduce((acc, violation) => {
    if (!acc[violation.alert_type]) {
      acc[violation.alert_type] = {
        count: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    }
    acc[violation.alert_type].count++;
    acc[violation.alert_type][violation.severity]++;
    return acc;
  }, {});
  
  return grouped;
}

function calculateServerComplianceStatus(servers: any[], violations: any[]) {
  const compliant = servers.filter(s => 
    !violations.some(v => v.server_id === s.id)
  ).length;
  
  const nonCompliant = servers.length - compliant;
  
  return {
    compliant,
    nonCompliant,
    total: servers.length,
    complianceRate: servers.length > 0 ? Math.round((compliant / servers.length) * 100) : 100
  };
}

function identifyTopIssues(violations: any[]) {
  const issueTypes = violations.reduce((acc, violation) => {
    if (!acc[violation.alert_type]) {
      acc[violation.alert_type] = 0;
    }
    acc[violation.alert_type]++;
    return acc;
  }, {});
  
  return Object.entries(issueTypes)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));
}

function generateActionItems(violations: any[]) {
  const actionItems = [];
  
  const criticalViolations = violations.filter(v => v.severity === 'critical');
  if (criticalViolations.length > 0) {
    actionItems.push({
      priority: 'critical',
      action: `Resolve ${criticalViolations.length} critical security violations immediately`,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
  }
  
  const eolViolations = violations.filter(v => v.alert_type === 'os_eol');
  if (eolViolations.length > 0) {
    actionItems.push({
      priority: 'high',
      action: `Plan OS upgrades for ${eolViolations.length} end-of-life systems`,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    });
  }
  
  return actionItems;
}

function generateDetailedRecommendations(servers: any[], violations: any[], policies: any[]) {
  const recommendations = [];
  
  // Security recommendations
  const securityViolations = violations.filter(v => 
    v.alert_type.includes('security') || v.alert_type.includes('credential')
  );
  
  if (securityViolations.length > 0) {
    recommendations.push({
      category: 'Security',
      priority: 'High',
      recommendation: 'Implement automated credential rotation and security hardening',
      impact: 'Reduces security vulnerabilities and compliance violations'
    });
  }
  
  // Policy recommendations
  if (policies.filter(p => p.is_active).length < 3) {
    recommendations.push({
      category: 'Governance',
      priority: 'Medium',
      recommendation: 'Implement comprehensive governance policies for all compliance domains',
      impact: 'Improves automated compliance monitoring and enforcement'
    });
  }
  
  return recommendations;
}