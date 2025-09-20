import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PolicyEvaluationRequest {
  policyId: string;
  targetServers?: string[];
  includeRemediation?: boolean;
  simulationMode?: boolean;
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
      policyId,
      targetServers = [],
      includeRemediation = true,
      simulationMode = false
    }: PolicyEvaluationRequest = await req.json();

    console.log(`Evaluating policy ${policyId} for ${targetServers.length || 'all'} servers`);

    // Fetch the policy
    const { data: policy, error: policyError } = await supabase
      .from('governance_policies')
      .select('*')
      .eq('id', policyId)
      .single();

    if (policyError) throw policyError;
    if (!policy) throw new Error('Policy not found');

    // Fetch target servers
    let serversQuery = supabase
      .from('servers')
      .select(`
        *,
        server_readiness_checks(*),
        virtual_machines(*),
        vcenter_clusters(*)
      `);

    if (targetServers.length > 0) {
      serversQuery = serversQuery.in('id', targetServers);
    }

    const { data: servers, error: serversError } = await serversQuery;
    if (serversError) throw serversError;

    const executions = [];
    const violations = [];

    // Evaluate policy against each server
    for (const server of servers || []) {
      const evaluation = await evaluatePolicyAgainstServer(server, policy, simulationMode);
      
      const execution = {
        id: crypto.randomUUID(),
        policyId: policy.id,
        serverId: server.id,
        serverName: server.hostname || server.id,
        executedAt: new Date().toISOString(),
        result: evaluation.result,
        details: evaluation.details,
        remediation: evaluation.remediation
      };

      executions.push(execution);

      // If policy failed, create violation record
      if (evaluation.result === 'fail' && !simulationMode) {
        const violation = {
          id: crypto.randomUUID(),
          policyId: policy.id,
          policyName: policy.policy_name,
          serverId: server.id,
          serverName: server.hostname || server.id,
          severity: mapEnforcementToSeverity(policy.enforcement_level),
          violationType: policy.policy_type,
          description: `Policy violation: ${evaluation.details.reason}`,
          detectedAt: new Date().toISOString(),
          status: 'open',
          remediationSteps: evaluation.remediation?.steps || []
        };

        violations.push(violation);

        // Store violation in database if not simulation
        await supabase.from('eol_alerts').insert({
          server_id: server.id,
          alert_type: 'policy_violation',
          severity: violation.severity,
          message: violation.description,
          recommendation: violation.remediationSteps.join('; ')
        });
      }
    }

    // Calculate policy metrics
    const metrics = calculatePolicyMetrics(executions, policy);

    // Log policy evaluation
    await supabase.from('operational_events').insert({
      event_type: 'policy_evaluation',
      event_source: 'governance_policy_engine',
      title: `Policy evaluation: ${policy.policy_name}`,
      description: `Evaluated ${executions.length} servers, ${violations.length} violations found`,
      status: 'completed',
      severity: violations.length > 0 ? 'warning' : 'info',
      metadata: {
        policyId,
        targetServers: targetServers.length > 0 ? targetServers : 'all',
        executionsCount: executions.length,
        violationsCount: violations.length,
        simulationMode
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        policy: {
          id: policy.id,
          name: policy.policy_name,
          type: policy.policy_type,
          enforcementLevel: policy.enforcement_level
        },
        executions,
        violations,
        metrics,
        summary: {
          serversEvaluated: executions.length,
          passed: executions.filter(e => e.result === 'pass').length,
          failed: executions.filter(e => e.result === 'fail').length,
          warnings: executions.filter(e => e.result === 'warning').length,
          violationsCreated: violations.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Policy evaluation error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Policy evaluation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function evaluatePolicyAgainstServer(server: any, policy: any, simulationMode: boolean) {
  const policyRules = policy.policy_rules || {};
  const conditions = policyRules.conditions || [];
  const actions = policyRules.actions || [];

  const evaluation = {
    result: 'pass' as 'pass' | 'fail' | 'warning',
    details: {
      conditionsEvaluated: conditions.length,
      conditionResults: [] as any[],
      reason: ''
    },
    remediation: null as any
  };

  // Evaluate each condition
  for (const condition of conditions) {
    const conditionResult = evaluateCondition(server, condition);
    evaluation.details.conditionResults.push({
      condition: condition.metric,
      expected: condition.value,
      actual: getServerMetricValue(server, condition.metric),
      passed: conditionResult.passed
    });

    if (!conditionResult.passed) {
      evaluation.result = 'fail';
      evaluation.details.reason = conditionResult.reason;
      break;
    }
  }

  // If policy failed, generate remediation
  if (evaluation.result === 'fail' && actions.length > 0) {
    evaluation.remediation = generateRemediationForActions(server, actions, simulationMode);
  }

  // Check for warnings (conditions that are concerning but not failures)
  if (evaluation.result === 'pass') {
    const warningConditions = checkWarningConditions(server, policy);
    if (warningConditions.length > 0) {
      evaluation.result = 'warning';
      evaluation.details.reason = `Warning conditions detected: ${warningConditions.join(', ')}`;
    }
  }

  return evaluation;
}

function evaluateCondition(server: any, condition: any) {
  const { metric, operator, value } = condition;
  const serverValue = getServerMetricValue(server, metric);

  if (serverValue === undefined) {
    return {
      passed: false,
      reason: `Unable to evaluate metric: ${metric}`
    };
  }

  let passed = false;
  let reason = '';

  switch (operator) {
    case 'equals':
      passed = serverValue === value;
      reason = passed ? '' : `${metric} is ${serverValue}, expected ${value}`;
      break;
    case 'not_equals':
      passed = serverValue !== value;
      reason = passed ? '' : `${metric} should not be ${value}`;
      break;
    case 'greater_than':
      passed = serverValue > value;
      reason = passed ? '' : `${metric} is ${serverValue}, must be greater than ${value}`;
      break;
    case 'less_than':
      passed = serverValue < value;
      reason = passed ? '' : `${metric} is ${serverValue}, must be less than ${value}`;
      break;
    case 'contains':
      passed = String(serverValue).includes(String(value));
      reason = passed ? '' : `${metric} does not contain ${value}`;
      break;
    default:
      return {
        passed: false,
        reason: `Unknown operator: ${operator}`
      };
  }

  return { passed, reason };
}

function getServerMetricValue(server: any, metric: string): any {
  switch (metric) {
    case 'firmware_age_days':
      if (server.last_firmware_update) {
        return Math.floor((Date.now() - new Date(server.last_firmware_update).getTime()) / (1000 * 60 * 60 * 24));
      }
      return undefined;
    
    case 'ssl_enabled':
      return server.ssl_enabled || false;
    
    case 'default_passwords':
      return server.server_readiness_checks?.[0]?.credential_status === 'failed';
    
    case 'maintenance_scheduled':
      // Check if server has any scheduled maintenance
      return server.maintenance_mode || false;
    
    case 'business_hours_maintenance':
      // Check if maintenance is scheduled during business hours (9-17)
      if (server.next_maintenance_window) {
        const maintenanceHour = new Date(server.next_maintenance_window).getHours();
        return maintenanceHour >= 9 && maintenanceHour <= 17;
      }
      return false;
    
    case 'vm_count':
      return server.virtual_machines?.length || 0;
    
    case 'cluster_ha_enabled':
      return server.vcenter_clusters?.some((c: any) => c.ha_enabled) || false;
    
    case 'readiness_score':
      return server.server_readiness_checks?.[0]?.readiness_score || 0;
    
    case 'os_eol_status':
      return server.os_eol_date ? (new Date(server.os_eol_date) <= new Date() ? 'eol' : 'supported') : 'unknown';
    
    default:
      // Try to get direct property
      return server[metric];
  }
}

function checkWarningConditions(server: any, policy: any): string[] {
  const warnings = [];

  // Check for common warning scenarios
  if (server.virtual_machines?.length > 20) {
    warnings.push('High VM count may impact maintenance');
  }

  if (server.server_readiness_checks?.[0]?.readiness_score < 80) {
    warnings.push('Low readiness score');
  }

  if (server.os_eol_date && new Date(server.os_eol_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) {
    warnings.push('OS approaching EOL within 90 days');
  }

  return warnings;
}

function generateRemediationForActions(server: any, actions: any[], simulationMode: boolean) {
  const remediationSteps = [];
  let autoRemediationPossible = false;

  for (const action of actions) {
    switch (action.type) {
      case 'alert':
        remediationSteps.push('Review and acknowledge alert');
        remediationSteps.push('Investigate root cause');
        break;
      
      case 'block':
        remediationSteps.push('System access blocked - resolve policy violations');
        remediationSteps.push('Contact administrator for assistance');
        break;
      
      case 'quarantine':
        remediationSteps.push('Server quarantined - investigate security concerns');
        remediationSteps.push('Run security scans and updates');
        break;
      
      case 'auto_remediate':
        autoRemediationPossible = true;
        remediationSteps.push('Automatic remediation available');
        remediationSteps.push('Review proposed changes before applying');
        break;
      
      default:
        remediationSteps.push(`Execute action: ${action.type}`);
    }
  }

  return {
    steps: remediationSteps,
    autoRemediationPossible,
    status: simulationMode ? 'simulated' : 'pending'
  };
}

function mapEnforcementToSeverity(enforcementLevel: string): string {
  switch (enforcementLevel) {
    case 'block': return 'critical';
    case 'warn': return 'medium';
    case 'monitor': return 'low';
    default: return 'medium';
  }
}

function calculatePolicyMetrics(executions: any[], policy: any) {
  const totalExecutions = executions.length;
  const passed = executions.filter(e => e.result === 'pass').length;
  const failed = executions.filter(e => e.result === 'fail').length;
  const warnings = executions.filter(e => e.result === 'warning').length;

  const successRate = totalExecutions > 0 ? Math.round((passed / totalExecutions) * 100) : 100;
  const failureRate = totalExecutions > 0 ? Math.round((failed / totalExecutions) * 100) : 0;

  return {
    policyId: policy.id,
    policyName: policy.policy_name,
    executionMetrics: {
      total: totalExecutions,
      passed,
      failed,
      warnings,
      successRate,
      failureRate
    },
    lastEvaluated: new Date().toISOString(),
    trend: 'stable' // Would be calculated from historical data
  };
}