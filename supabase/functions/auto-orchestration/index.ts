import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutoOrchestrationConfig {
  enabled: boolean;
  execution_interval_months: number;
  update_interval_minutes: number;
  maintenance_window_start: string;
  maintenance_window_end: string;
  cluster_priority_order: string[];
}

interface Server {
  id: string;
  hostname: string;
  cluster_name: string | null;
  environment: string;
  vcenter_id: string | null;
  model: string;
  service_tag: string;
  last_updated: string | null;
}

interface VCenterCluster {
  id: string;
  name: string;
  vcenter_id: string;
  total_hosts: number;
  active_hosts: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('Starting auto-orchestration process');

    // Get auto-orchestration configuration
    const { data: config, error: configError } = await supabase
      .from('auto_orchestration_config')
      .select('*')
      .single();

    if (configError || !config?.enabled) {
      console.log('Auto-orchestration is disabled or config not found');
      return new Response(
        JSON.stringify({ message: 'Auto-orchestration disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all servers and clusters
    const [serversResult, clustersResult, packagesResult] = await Promise.all([
      supabase.from('servers').select('*'),
      supabase.from('vcenter_clusters').select('*'),
      supabase.from('dell_update_packages').select('*').order('update_sequence_order')
    ]);

    if (serversResult.error || clustersResult.error || packagesResult.error) {
      throw new Error('Failed to fetch required data');
    }

    const servers: Server[] = serversResult.data;
    const clusters: VCenterCluster[] = clustersResult.data;
    const packages = packagesResult.data;

    console.log(`Processing ${servers.length} servers and ${clusters.length} clusters`);

    // Group servers by cluster or standalone
    const serverGroups = groupServersByCluster(servers, clusters);

    // Generate orchestration plans
    const plans = await generateOrchestrationPlans(
      serverGroups,
      packages,
      config,
      supabase
    );

    // Create or update orchestration plans
    const createdPlans = await createOrchestrationPlans(plans, supabase);

    // Log the operation
    await logSystemEvent(supabase, {
      event_type: 'auto_orchestration_completed',
      severity: 'info',
      title: 'Auto-orchestration completed',
      description: `Generated ${createdPlans.length} orchestration plans`,
      metadata: {
        plans_created: createdPlans.length,
        servers_processed: servers.length,
        clusters_processed: clusters.length
      }
    });

    console.log(`Auto-orchestration completed: ${createdPlans.length} plans created`);

    return new Response(
      JSON.stringify({
        success: true,
        plans_created: createdPlans.length,
        servers_processed: servers.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-orchestration error:', error);

    // Log error event
    await logSystemEvent(supabase, {
      event_type: 'auto_orchestration_error',
      severity: 'error',
      title: 'Auto-orchestration failed',
      description: error.message,
      metadata: { error: error.toString() }
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function groupServersByCluster(servers: Server[], clusters: VCenterCluster[]) {
  const groups: { [key: string]: Server[] } = {};
  
  servers.forEach(server => {
    if (server.vcenter_id && server.cluster_name) {
      // Server is part of a vCenter cluster
      const groupKey = `cluster_${server.cluster_name}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(server);
    } else {
      // Standalone server
      const groupKey = `standalone_${server.id}`;
      groups[groupKey] = [server];
    }
  });

  return groups;
}

async function generateOrchestrationPlans(
  serverGroups: { [key: string]: Server[] },
  packages: any[],
  config: AutoOrchestrationConfig,
  supabase: any
) {
  const plans = [];
  const now = new Date();
  
  // Calculate next execution time (distribute across maintenance windows)
  let currentPlanTime = new Date(now);
  currentPlanTime.setMonth(currentPlanTime.getMonth() + config.execution_interval_months);
  
  // Sort groups by priority (production clusters first, then by environment)
  const sortedGroups = Object.entries(serverGroups).sort(([keyA, serversA], [keyB, serversB]) => {
    const envA = serversA[0]?.environment || 'unknown';
    const envB = serversB[0]?.environment || 'unknown';
    
    const priorityA = config.cluster_priority_order.indexOf(envA);
    const priorityB = config.cluster_priority_order.indexOf(envB);
    
    return (priorityA === -1 ? 999 : priorityA) - (priorityB === -1 ? 999 : priorityB);
  });

  for (const [groupKey, servers] of sortedGroups) {
    const isCluster = groupKey.startsWith('cluster_');
    const clusterName = isCluster ? groupKey.replace('cluster_', '') : null;
    
    // Check if servers need updates (6 months since last update)
    const needsUpdate = servers.some(server => {
      if (!server.last_updated) return true;
      const lastUpdate = new Date(server.last_updated);
      const monthsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsSinceUpdate >= config.execution_interval_months;
    });

    if (!needsUpdate) {
      console.log(`Skipping ${groupKey} - no update needed yet`);
      continue;
    }

    // Generate update sequence for this group
    const updateSequence = generateUpdateSequence(servers, packages, config);
    
    // Check for existing plans and mark for overwrite if manual
    const { data: existingPlans } = await supabase
      .from('update_orchestration_plans')
      .select('*')
      .in('server_ids', servers.map(s => s.id))
      .eq('status', 'planned');

    let overwrittenPlanId = null;
    if (existingPlans && existingPlans.length > 0) {
      const manualPlan = existingPlans.find(p => !p.is_auto_generated);
      if (manualPlan) {
        overwrittenPlanId = manualPlan.id;
        console.log(`Will overwrite manual plan ${manualPlan.id} for ${groupKey}`);
      }
    }

    const plan = {
      name: `Auto-Generated ${isCluster ? 'Cluster' : 'Server'} Update: ${clusterName || servers[0].hostname}`,
      server_ids: servers.map(s => s.id),
      cluster_id: isCluster ? servers[0].vcenter_id : null,
      update_sequence: updateSequence,
      safety_checks: generateSafetyChecks(servers, isCluster),
      vmware_settings: isCluster ? generateVMwareSettings() : null,
      rollback_plan: generateRollbackPlan(servers),
      status: 'planned',
      is_auto_generated: true,
      next_execution_date: currentPlanTime.toISOString(),
      execution_interval_months: config.execution_interval_months,
      overwritten_plan_id: overwrittenPlanId,
      total_steps: updateSequence.length
    };

    plans.push(plan);

    // Space out plans by update interval
    currentPlanTime = new Date(currentPlanTime.getTime() + (config.update_interval_minutes * 60 * 1000));
  }

  return plans;
}

function generateUpdateSequence(servers: Server[], packages: any[], config: AutoOrchestrationConfig) {
  const sequence = [];
  
  servers.forEach((server, index) => {
    // Find compatible packages for this server
    const compatiblePackages = packages.filter(pkg => 
      !pkg.service_tag_compatibility || 
      pkg.service_tag_compatibility.includes(server.service_tag)
    );

    // Sort packages by update order and criticality
    compatiblePackages.sort((a, b) => {
      if (a.update_sequence_order !== b.update_sequence_order) {
        return a.update_sequence_order - b.update_sequence_order;
      }
      const criticalityOrder = { critical: 0, important: 1, recommended: 2, optional: 3 };
      return (criticalityOrder[a.criticality] || 3) - (criticalityOrder[b.criticality] || 3);
    });

    const updateStep = {
      step_number: index + 1,
      server_id: server.id,
      server_hostname: server.hostname,
      update_packages: compatiblePackages.slice(0, 5), // Limit to top 5 packages
      estimated_duration_minutes: compatiblePackages.length * 15,
      requires_reboot: compatiblePackages.some(pkg => pkg.requires_reboot),
      prerequisites: [`Verify ${server.hostname} is accessible`],
      rollback_commands: [`Restore ${server.hostname} configuration`]
    };

    sequence.push(updateStep);
  });

  return sequence;
}

function generateSafetyChecks(servers: Server[], isCluster: boolean) {
  const checks = [
    'Verify server connectivity',
    'Check available disk space',
    'Validate backup completion',
    'Confirm maintenance window'
  ];

  if (isCluster) {
    checks.push(
      'Verify vCenter cluster health',
      'Check HA/DRS status',
      'Ensure sufficient cluster capacity'
    );
  }

  return { pre_update_checks: checks };
}

function generateVMwareSettings() {
  return {
    enable_maintenance_mode: true,
    evacuate_vms: true,
    ha_admission_control_enabled: true,
    drs_automation_level: 'fullyAutomated'
  };
}

function generateRollbackPlan(servers: Server[]) {
  return servers.map(server => ({
    server_id: server.id,
    rollback_steps: [
      'Power down server',
      'Restore previous firmware versions',
      'Verify system functionality',
      'Exit maintenance mode'
    ]
  }));
}

async function createOrchestrationPlans(plans: any[], supabase: any) {
  const createdPlans = [];

  for (const plan of plans) {
    try {
      // Delete existing plans for these servers if auto-generated
      if (plan.server_ids.length > 0) {
        await supabase
          .from('update_orchestration_plans')
          .delete()
          .in('server_ids', plan.server_ids)
          .eq('is_auto_generated', true);

        // If overwriting a manual plan, log it
        if (plan.overwritten_plan_id) {
          await logSystemEvent(supabase, {
            event_type: 'manual_plan_overwritten',
            severity: 'warning',
            title: 'Manual orchestration plan overwritten',
            description: `Manual plan ${plan.overwritten_plan_id} was overwritten by auto-generated plan for servers: ${plan.server_ids.join(', ')}`,
            metadata: {
              overwritten_plan_id: plan.overwritten_plan_id,
              server_ids: plan.server_ids,
              plan_name: plan.name
            }
          });

          // Mark the manual plan as overwritten
          await supabase
            .from('update_orchestration_plans')
            .update({ status: 'overwritten' })
            .eq('id', plan.overwritten_plan_id);
        }
      }

      // Create new plan
      const { data, error } = await supabase
        .from('update_orchestration_plans')
        .insert(plan)
        .select()
        .single();

      if (error) {
        console.error('Error creating plan:', error);
        continue;
      }

      createdPlans.push(data);
      console.log(`Created plan: ${plan.name}`);

    } catch (error) {
      console.error('Error processing plan:', error);
    }
  }

  return createdPlans;
}

async function logSystemEvent(supabase: any, event: {
  event_type: string;
  severity: string;
  title: string;
  description: string;
  metadata?: any;
}) {
  try {
    await supabase
      .from('system_events')
      .insert({
        ...event,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log system event:', error);
  }
}