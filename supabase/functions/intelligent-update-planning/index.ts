import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlanningRequest {
  serverIds: string[];
  firmwarePackages: string[];
  constraints: {
    maxConcurrentUpdates?: number;
    maintenanceWindows?: Array<{ start: string; end: string }>;
    criticalSystemProtection?: boolean;
    rollbackStrategy?: 'automatic' | 'manual' | 'conditional';
  };
  planType: 'intelligent_orchestration' | 'sequential' | 'parallel';
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
      serverIds,
      firmwarePackages,
      constraints,
      planType
    }: PlanningRequest = await req.json();

    console.log(`Generating ${planType} plan for ${serverIds.length} servers with ${firmwarePackages.length} firmware packages`);

    // Fetch comprehensive server data
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select(`
        *,
        server_readiness_checks(*),
        virtual_machines(*),
        vcenter_clusters(*)
      `)
      .in('id', serverIds);

    if (serversError) throw serversError;

    // Fetch firmware package details
    const { data: packages, error: packagesError } = await supabase
      .from('firmware_packages')
      .select('*')
      .in('id', firmwarePackages);

    if (packagesError) throw packagesError;

    // Analyze server dependencies and grouping
    const serverGroups = await analyzeServerDependencies(servers, supabase);
    
    // Generate intelligent update sequence
    const updateSequence = await generateUpdateSequence(serverGroups, constraints);
    
    // Create comprehensive safety checks
    const safetyChecks = generateSafetyChecks(servers, packages);
    
    // Generate rollback plan
    const rollbackPlan = generateRollbackPlan(servers, packages, constraints);

    // Calculate estimated timeline
    const timeline = calculateEstimatedTimeline(updateSequence, packages);

    // Create the intelligent plan
    const planId = crypto.randomUUID();
    const plan = {
      id: planId,
      name: `Intelligent Update Plan - ${new Date().toLocaleDateString()}`,
      serverGroups: updateSequence,
      safetyChecks,
      rollbackPlan,
      timeline,
      constraints,
      metadata: {
        createdAt: new Date().toISOString(),
        planType,
        totalServers: serverIds.length,
        totalPackages: firmwarePackages.length,
        estimatedDuration: timeline.totalDuration
      }
    };

    // Store the plan in the database
    const { error: planError } = await supabase
      .from('update_orchestration_plans')
      .insert({
        id: planId,
        name: plan.name,
        server_ids: serverIds,
        update_sequence: updateSequence,
        safety_checks: safetyChecks,
        rollback_plan: rollbackPlan,
        status: 'planned',
        estimated_duration: `${timeline.totalDuration} minutes`,
        total_steps: updateSequence.length
      });

    if (planError) throw planError;

    // Log the planning activity
    await supabase.from('operational_events').insert({
      event_type: 'update_planning',
      event_source: 'intelligent_update_system',
      title: `Intelligent update plan generated`,
      description: `Created ${planType} plan for ${serverIds.length} servers with ${updateSequence.length} execution groups`,
      status: 'completed',
      severity: 'info',
      metadata: {
        planId,
        serverIds,
        firmwarePackages,
        planType,
        groupCount: updateSequence.length
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        plan,
        summary: {
          planId,
          totalGroups: updateSequence.length,
          estimatedDuration: timeline.totalDuration,
          safetyCheckCount: safetyChecks.preUpdate.length + safetyChecks.postUpdate.length,
          rollbackSteps: rollbackPlan.recoverySteps.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Intelligent planning error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Intelligent update planning failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function analyzeServerDependencies(servers: any[], supabase: any) {
  const groups = [];
  const processed = new Set();

  for (const server of servers) {
    if (processed.has(server.id)) continue;

    const group = {
      groupId: crypto.randomUUID(),
      servers: [server.id],
      riskLevel: calculateServerRiskLevel(server),
      dependencies: [],
      criticalityScore: calculateCriticalityScore(server)
    };

    // Find servers in same cluster or with VM dependencies
    const relatedServers = servers.filter(s => 
      !processed.has(s.id) && 
      s.id !== server.id &&
      areServersRelated(server, s)
    );

    relatedServers.forEach(relatedServer => {
      group.servers.push(relatedServer.id);
      processed.add(relatedServer.id);
    });

    // Determine dependencies based on cluster relationships
    if (server.vcenter_clusters?.length > 0) {
      group.dependencies = findClusterDependencies(server, servers);
    }

    groups.push(group);
    processed.add(server.id);
  }

  return groups.sort((a, b) => b.criticalityScore - a.criticalityScore);
}

function calculateServerRiskLevel(server: any): 'low' | 'medium' | 'high' {
  let riskPoints = 0;

  // VM count increases risk
  const vmCount = server.virtual_machines?.length || 0;
  if (vmCount > 20) riskPoints += 3;
  else if (vmCount > 10) riskPoints += 2;
  else if (vmCount > 5) riskPoints += 1;

  // HA clusters increase risk
  if (server.vcenter_clusters?.some((c: any) => c.ha_enabled)) {
    riskPoints += 2;
  }

  // Recent readiness checks
  const readiness = server.server_readiness_checks?.[0];
  if (readiness?.overall_readiness === 'not_ready') riskPoints += 3;
  else if (readiness?.overall_readiness === 'ready_with_warnings') riskPoints += 1;

  if (riskPoints >= 5) return 'high';
  if (riskPoints >= 2) return 'medium';
  return 'low';
}

function calculateCriticalityScore(server: any): number {
  let score = 0;

  // Base score for having VMs
  const vmCount = server.virtual_machines?.length || 0;
  score += vmCount * 2;

  // Bonus for HA clusters
  if (server.vcenter_clusters?.some((c: any) => c.ha_enabled)) {
    score += 20;
  }

  // Penalty for poor readiness
  const readiness = server.server_readiness_checks?.[0];
  if (readiness?.overall_readiness === 'ready') {
    score += 10;
  } else if (readiness?.overall_readiness === 'ready_with_warnings') {
    score += 5;
  }

  return score;
}

function areServersRelated(server1: any, server2: any): boolean {
  // Check if servers are in the same vCenter cluster
  const cluster1 = server1.vcenter_clusters?.[0];
  const cluster2 = server2.vcenter_clusters?.[0];
  
  return cluster1 && cluster2 && cluster1.id === cluster2.id;
}

function findClusterDependencies(server: any, allServers: any[]): string[] {
  const cluster = server.vcenter_clusters?.[0];
  if (!cluster) return [];

  // Find other servers that might need to be updated first
  return allServers
    .filter(s => s.id !== server.id && s.vcenter_clusters?.[0]?.id === cluster.id)
    .map(s => s.id);
}

async function generateUpdateSequence(serverGroups: any[], constraints: any) {
  const maxConcurrent = constraints.maxConcurrentUpdates || 3;
  const sequence = [];

  // Sort groups by risk and criticality
  const sortedGroups = [...serverGroups].sort((a, b) => {
    // Process low-risk groups first
    if (a.riskLevel !== b.riskLevel) {
      const riskOrder = { 'low': 0, 'medium': 1, 'high': 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }
    return b.criticalityScore - a.criticalityScore;
  });

  let currentBatch = [];
  let batchIndex = 0;

  for (const group of sortedGroups) {
    // Determine scheduling window
    const scheduledWindow = calculateScheduledWindow(group, batchIndex, constraints);
    
    const sequenceItem = {
      groupId: group.groupId,
      servers: group.servers,
      riskLevel: group.riskLevel,
      scheduledWindow,
      dependencies: group.dependencies,
      batchIndex,
      executionOrder: sequence.length,
      safeguards: generateGroupSafeguards(group)
    };

    sequence.push(sequenceItem);

    // Increment batch for high-risk groups or when batch is full
    if (group.riskLevel === 'high' || currentBatch.length >= maxConcurrent) {
      batchIndex++;
      currentBatch = [];
    } else {
      currentBatch.push(group);
    }
  }

  return sequence;
}

function calculateScheduledWindow(group: any, batchIndex: number, constraints: any): string {
  const now = new Date();
  const baseDelay = batchIndex * 30; // 30 minutes between batches
  
  // If maintenance windows are specified, use them
  if (constraints.maintenanceWindows && constraints.maintenanceWindows.length > 0) {
    const window = constraints.maintenanceWindows[0];
    const windowStart = new Date(window.start);
    windowStart.setMinutes(windowStart.getMinutes() + baseDelay);
    return windowStart.toISOString();
  }

  // Default to next suitable window
  const scheduledTime = new Date(now.getTime() + (baseDelay + 60) * 60 * 1000);
  return scheduledTime.toISOString();
}

function generateGroupSafeguards(group: any): string[] {
  const safeguards = [
    'Verify all servers in group are accessible',
    'Confirm VM status and dependencies',
    'Check cluster health status'
  ];

  if (group.riskLevel === 'high') {
    safeguards.push(
      'Ensure backup systems are operational',
      'Verify rollback procedures are tested',
      'Confirm emergency contact availability'
    );
  }

  return safeguards;
}

function generateSafetyChecks(servers: any[], packages: any[]) {
  return {
    preUpdate: [
      'Verify server connectivity and credentials',
      'Confirm firmware package compatibility',
      'Check cluster health and HA status',
      'Validate backup systems availability',
      'Verify maintenance window approval',
      'Confirm VM migration readiness'
    ],
    postUpdate: [
      'Verify firmware update completion',
      'Check server boot status and connectivity',
      'Validate VM operational status',
      'Confirm cluster rejoining process',
      'Monitor performance metrics',
      'Verify service availability'
    ],
    rollbackValidation: [
      'Confirm rollback firmware availability',
      'Verify system restore capabilities',
      'Check VM restoration procedures',
      'Validate cluster recovery process'
    ]
  };
}

function generateRollbackPlan(servers: any[], packages: any[], constraints: any) {
  return {
    checkpoints: [
      'Pre-update system state backup',
      'Firmware package staging verification',
      'Update initiation confirmation',
      'Post-update validation checkpoint'
    ],
    rollbackTriggers: [
      'Update failure or timeout',
      'System boot failure',
      'Critical service unavailability',
      'Manual rollback request',
      'Performance degradation threshold exceeded'
    ],
    recoverySteps: [
      'Halt update process immediately',
      'Restore previous firmware version',
      'Restart server and verify boot',
      'Restore VM operations',
      'Rejoin cluster if applicable',
      'Validate system functionality',
      'Generate incident report'
    ]
  };
}

function calculateEstimatedTimeline(updateSequence: any[], packages: any[]) {
  const avgUpdateTime = 45; // minutes per server
  const batchSetupTime = 15; // minutes between batches
  
  let totalDuration = 0;
  let currentBatch = 0;

  updateSequence.forEach(item => {
    if (item.batchIndex > currentBatch) {
      totalDuration += batchSetupTime;
      currentBatch = item.batchIndex;
    }
    totalDuration += avgUpdateTime; // Assuming parallel execution within batch
  });

  return {
    totalDuration,
    avgUpdateTime,
    batchCount: currentBatch + 1,
    estimatedStart: new Date().toISOString(),
    estimatedEnd: new Date(Date.now() + totalDuration * 60 * 1000).toISOString()
  };
}