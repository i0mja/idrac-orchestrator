import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ComplianceCheckRequest {
  serverIds?: string[];
  includeRemediation?: boolean;
  generateReport?: boolean;
  checkTypes?: string[];
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
      serverIds = [],
      includeRemediation = true,
      generateReport = false,
      checkTypes = ['firmware_eol', 'security_compliance', 'lifecycle_management']
    }: ComplianceCheckRequest = await req.json();

    console.log(`Running compliance checks for ${serverIds.length || 'all'} servers`);

    // Fetch target servers
    let serversQuery = supabase
      .from('servers')
      .select(`
        *,
        server_readiness_checks(*),
        virtual_machines(*),
        vcenter_clusters(*)
      `);

    if (serverIds.length > 0) {
      serversQuery = serversQuery.in('id', serverIds);
    }

    const { data: servers, error: serversError } = await serversQuery;
    if (serversError) throw serversError;

    // Fetch existing governance policies
    const { data: policies, error: policiesError } = await supabase
      .from('governance_policies')
      .select('*')
      .eq('is_active', true);

    if (policiesError) throw policiesError;

    // Run compliance checks
    const violations = [];
    const complianceResults = [];

    for (const server of servers || []) {
      console.log(`Checking compliance for server: ${server.hostname || server.id}`);

      // Firmware EOL Check
      if (checkTypes.includes('firmware_eol')) {
        const firmwareViolations = await checkFirmwareCompliance(server, supabase);
        violations.push(...firmwareViolations);
      }

      // Security Compliance Check
      if (checkTypes.includes('security_compliance')) {
        const securityViolations = await checkSecurityCompliance(server, supabase);
        violations.push(...securityViolations);
      }

      // Lifecycle Management Check
      if (checkTypes.includes('lifecycle_management')) {
        const lifecycleViolations = await checkLifecycleCompliance(server, supabase);
        violations.push(...lifecycleViolations);
      }

      // Policy Compliance Check
      for (const policy of policies || []) {
        const policyViolation = await evaluatePolicyCompliance(server, policy, supabase);
        if (policyViolation) {
          violations.push(policyViolation);
        }
      }

      // Calculate server compliance score
      const serverScore = calculateServerComplianceScore(server, violations);
      complianceResults.push({
        serverId: server.id,
        serverName: server.hostname || server.id,
        complianceScore: serverScore,
        violationsCount: violations.filter(v => v.serverId === server.id).length
      });
    }

    // Calculate overall metrics
    const metrics = calculateComplianceMetrics(complianceResults, violations);

    // Generate remediation recommendations if requested
    let remediationPlan = null;
    if (includeRemediation) {
      remediationPlan = await generateRemediationPlan(violations, supabase);
    }

    // Log compliance check activity
    await supabase.from('operational_events').insert({
      event_type: 'compliance_check',
      event_source: 'automated_compliance_system',
      title: `Compliance check completed`,
      description: `Found ${violations.length} violations across ${servers?.length || 0} servers`,
      status: 'completed',
      severity: violations.some(v => v.severity === 'critical') ? 'high' : 'info',
      metadata: {
        serverIds: serverIds.length > 0 ? serverIds : 'all',
        violationsCount: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'critical').length,
        complianceScore: metrics.overallScore
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        violations,
        metrics,
        remediationPlan,
        summary: {
          serversChecked: servers?.length || 0,
          violationsFound: violations.length,
          criticalViolations: violations.filter(v => v.severity === 'critical').length,
          overallComplianceScore: metrics.overallScore
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Compliance check error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Automated compliance check failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function checkFirmwareCompliance(server: any, supabase: any) {
  const violations = [];

  // Check for EOL firmware
  if (server.os_eol_date && new Date(server.os_eol_date) <= new Date()) {
    violations.push({
      id: crypto.randomUUID(),
      ruleId: 'firmware-eol-policy',
      serverId: server.id,
      serverName: server.hostname || server.id,
      violationType: 'firmware_eol',
      severity: 'critical',
      description: `Operating system ${server.operating_system} ${server.os_version} has reached end-of-life`,
      detectedAt: new Date().toISOString(),
      status: 'open',
      remediationSteps: [
        'Plan OS upgrade to supported version',
        'Review compatibility with current applications',
        'Schedule maintenance window for upgrade'
      ]
    });
  }

  // Check firmware age
  if (server.last_firmware_update) {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(server.last_firmware_update).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUpdate > 365) {
      violations.push({
        id: crypto.randomUUID(),
        ruleId: 'firmware-age-policy',
        serverId: server.id,
        serverName: server.hostname || server.id,
        violationType: 'firmware_outdated',
        severity: 'medium',
        description: `Firmware hasn't been updated in ${daysSinceUpdate} days`,
        detectedAt: new Date().toISOString(),
        status: 'open',
        remediationSteps: [
          'Review available firmware updates',
          'Test updates in development environment',
          'Schedule firmware update maintenance'
        ]
      });
    }
  }

  return violations;
}

async function checkSecurityCompliance(server: any, supabase: any) {
  const violations = [];

  // Check for default credentials (simulated check)
  const readiness = server.server_readiness_checks?.[0];
  if (readiness?.credential_status === 'failed') {
    violations.push({
      id: crypto.randomUUID(),
      ruleId: 'security-credentials-policy',
      serverId: server.id,
      serverName: server.hostname || server.id,
      violationType: 'credential_security',
      severity: 'high',
      description: 'Server may be using default or weak credentials',
      detectedAt: new Date().toISOString(),
      status: 'open',
      remediationSteps: [
        'Update to strong, unique credentials',
        'Enable multi-factor authentication if available',
        'Review credential rotation policy'
      ]
    });
  }

  // Check SSL/TLS configuration (simulated)
  if (server.model?.includes('PowerEdge') && !server.ssl_enabled) {
    violations.push({
      id: crypto.randomUUID(),
      ruleId: 'ssl-enforcement-policy',
      serverId: server.id,
      serverName: server.hostname || server.id,
      violationType: 'ssl_not_enforced',
      severity: 'medium',
      description: 'SSL/TLS not properly configured or enforced',
      detectedAt: new Date().toISOString(),
      status: 'open',
      remediationSteps: [
        'Enable SSL/TLS encryption',
        'Configure strong cipher suites',
        'Update certificates if expired'
      ]
    });
  }

  return violations;
}

async function checkLifecycleCompliance(server: any, supabase: any) {
  const violations = [];

  // Check server age and lifecycle
  if (server.created_at) {
    const serverAge = Math.floor((Date.now() - new Date(server.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365));
    
    if (serverAge > 5) {
      violations.push({
        id: crypto.randomUUID(),
        ruleId: 'hardware-lifecycle-policy',
        serverId: server.id,
        serverName: server.hostname || server.id,
        violationType: 'hardware_aging',
        severity: 'medium',
        description: `Server is ${serverAge} years old and approaching end-of-lifecycle`,
        detectedAt: new Date().toISOString(),
        status: 'open',
        remediationSteps: [
          'Evaluate hardware replacement options',
          'Plan migration to newer hardware',
          'Review maintenance and support coverage'
        ]
      });
    }
  }

  return violations;
}

async function evaluatePolicyCompliance(server: any, policy: any, supabase: any) {
  // Simplified policy evaluation logic
  const policyRules = policy.policy_rules || {};
  const conditions = policyRules.conditions || [];
  
  // Check if server violates any policy conditions
  for (const condition of conditions) {
    const violation = evaluateCondition(server, condition);
    if (violation) {
      return {
        id: crypto.randomUUID(),
        ruleId: policy.id,
        serverId: server.id,
        serverName: server.hostname || server.id,
        violationType: policy.policy_type,
        severity: policy.enforcement_level === 'block' ? 'critical' : 'medium',
        description: `Policy violation: ${policy.policy_name}`,
        detectedAt: new Date().toISOString(),
        status: 'open',
        remediationSteps: policyRules.actions?.map((a: any) => a.description) || ['Review policy requirements']
      };
    }
  }

  return null;
}

function evaluateCondition(server: any, condition: any): boolean {
  const { metric, operator, value } = condition;
  
  let serverValue;
  
  // Map metrics to server properties
  switch (metric) {
    case 'firmware_age_days':
      if (server.last_firmware_update) {
        serverValue = Math.floor((Date.now() - new Date(server.last_firmware_update).getTime()) / (1000 * 60 * 60 * 24));
      }
      break;
    case 'ssl_enabled':
      serverValue = server.ssl_enabled || false;
      break;
    case 'default_passwords':
      serverValue = server.server_readiness_checks?.[0]?.credential_status === 'failed';
      break;
    default:
      return false;
  }

  if (serverValue === undefined) return false;

  // Evaluate condition
  switch (operator) {
    case 'equals':
      return serverValue === value;
    case 'not_equals':
      return serverValue !== value;
    case 'greater_than':
      return serverValue > value;
    case 'less_than':
      return serverValue < value;
    case 'contains':
      return String(serverValue).includes(String(value));
    default:
      return false;
  }
}

function calculateServerComplianceScore(server: any, allViolations: any[]): number {
  const serverViolations = allViolations.filter(v => v.serverId === server.id);
  
  if (serverViolations.length === 0) return 100;
  
  // Calculate score based on violation severity
  let totalPenalty = 0;
  for (const violation of serverViolations) {
    switch (violation.severity) {
      case 'critical': totalPenalty += 25; break;
      case 'high': totalPenalty += 15; break;
      case 'medium': totalPenalty += 10; break;
      case 'low': totalPenalty += 5; break;
    }
  }
  
  return Math.max(0, 100 - totalPenalty);
}

function calculateComplianceMetrics(complianceResults: any[], violations: any[]) {
  const overallScore = complianceResults.length > 0 
    ? Math.round(complianceResults.reduce((sum, r) => sum + r.complianceScore, 0) / complianceResults.length)
    : 100;

  const categoryScores = {
    security: 85,
    lifecycle: 90,
    governance: 80,
    availability: 95
  };

  const totalViolations = violations.length;
  const criticalViolations = violations.filter(v => v.severity === 'critical').length;

  return {
    overallScore,
    categoryScores,
    totalViolations,
    criticalViolations,
    trendsData: [
      { date: new Date().toISOString(), score: overallScore, violations: totalViolations }
    ]
  };
}

async function generateRemediationPlan(violations: any[], supabase: any) {
  // Group violations by severity and type
  const plan = {
    immediate: violations.filter(v => v.severity === 'critical'),
    shortTerm: violations.filter(v => v.severity === 'high'),
    longTerm: violations.filter(v => ['medium', 'low'].includes(v.severity))
  };

  return {
    summary: `${plan.immediate.length} critical, ${plan.shortTerm.length} high-priority items`,
    phases: [
      {
        name: 'Immediate Action Required',
        violations: plan.immediate,
        timeframe: '24 hours'
      },
      {
        name: 'Short-term Remediation',
        violations: plan.shortTerm,
        timeframe: '1-2 weeks'
      },
      {
        name: 'Long-term Improvement',
        violations: plan.longTerm,
        timeframe: '1-3 months'
      }
    ]
  };
}