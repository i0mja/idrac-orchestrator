import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateOrchestrationRequest {
  serverIds: string[];
  updateType: 'immediate' | 'scheduled' | 'maintenance_window';
  scheduledTime?: string;
  maintenanceWindowId?: string;
  updateComponents: string[]; // ['bios', 'idrac', 'storage', 'network']
  forceUpdate?: boolean;
  rollbackOnFailure?: boolean;
  maxParallelUpdates?: number;
}

interface UpdatePlan {
  serverId: string;
  hostname: string;
  updates: ComponentUpdate[];
  estimatedDuration: number;
  updateOrder: number;
  prerequisites: string[];
}

interface ComponentUpdate {
  component: string;
  name: string;
  currentVersion: string;
  targetVersion: string;
  criticality: 'critical' | 'recommended' | 'optional';
  rebootRequired: boolean;
  estimatedTime: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const request: UpdateOrchestrationRequest = await req.json();

    // Validate request
    if (!request.serverIds || !Array.isArray(request.serverIds) || request.serverIds.length === 0) {
      throw new Error('serverIds array is required and must not be empty');
    }

    console.log(`Orchestrating updates for ${request.serverIds.length} servers`);

    // Validate servers and get their current state
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('*')
      .in('id', request.serverIds);

    if (serversError || !servers || servers.length === 0) {
      throw new Error('No valid servers found');
    }

    // Create update plan for each server
    const updatePlans = await createUpdatePlans(servers, request);
    
    // Validate update plans
    const validation = await validateUpdatePlans(updatePlans, request);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Update plan validation failed',
          issues: validation.issues
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create update jobs in database
    const createdJobs = await createUpdateJobs(supabase, updatePlans, request);

    // Execute updates based on type
    let executionResult;
    switch (request.updateType) {
      case 'immediate':
        executionResult = await executeImmediateUpdates(supabase, createdJobs, request);
        break;
      case 'scheduled':
        executionResult = await scheduleUpdates(supabase, createdJobs, request);
        break;
      case 'maintenance_window':
        executionResult = await scheduleMaintenanceWindow(supabase, createdJobs, request);
        break;
      default:
        throw new Error('Invalid update type');
    }

    return new Response(
      JSON.stringify({
        success: true,
        updateType: request.updateType,
        plannedUpdates: updatePlans.length,
        createdJobs: createdJobs.length,
        execution: executionResult,
        summary: {
          totalServers: servers.length,
          totalComponents: updatePlans.reduce((sum, plan) => sum + plan.updates.length, 0),
          estimatedDuration: Math.max(...updatePlans.map(p => p.estimatedDuration)),
          criticalUpdates: updatePlans.reduce((sum, plan) => 
            sum + plan.updates.filter(u => u.criticality === 'critical').length, 0
          )
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update orchestration error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to orchestrate updates',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createUpdatePlans(servers: any[], request: UpdateOrchestrationRequest): Promise<UpdatePlan[]> {
  const plans: UpdatePlan[] = [];

  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];
    
    try {
      console.log(`Creating update plan for ${server.hostname}`);

      // Get available firmware for this server
      const availableFirmware = await getServerAvailableFirmware(server, request.updateComponents);
      
      // Create component updates
      const updates: ComponentUpdate[] = availableFirmware.map(firmware => ({
        component: firmware.component,
        name: firmware.name,
        currentVersion: firmware.currentVersion,
        targetVersion: firmware.availableVersion,
        criticality: firmware.criticality,
        rebootRequired: firmware.rebootRequired,
        estimatedTime: getEstimatedUpdateTime(firmware.component, firmware.size)
      }));

      // Calculate total estimated duration
      const estimatedDuration = updates.reduce((total, update) => total + update.estimatedTime, 0);
      
      // Add extra time for reboots
      const rebootTime = updates.some(u => u.rebootRequired) ? 5 : 0; // 5 minutes for reboot
      
      const plan: UpdatePlan = {
        serverId: server.id,
        hostname: server.hostname,
        updates,
        estimatedDuration: estimatedDuration + rebootTime,
        updateOrder: i + 1,
        prerequisites: generatePrerequisites(updates, server)
      };

      plans.push(plan);

    } catch (error) {
      console.error(`Failed to create update plan for ${server.hostname}:`, error);
      // Continue with other servers
    }
  }

  // Sort plans by criticality and update order
  plans.sort((a, b) => {
    const aCritical = a.updates.filter(u => u.criticality === 'critical').length;
    const bCritical = b.updates.filter(u => u.criticality === 'critical').length;
    
    if (aCritical !== bCritical) {
      return bCritical - aCritical; // Critical updates first
    }
    
    return a.updateOrder - b.updateOrder;
  });

  return plans;
}

async function validateUpdatePlans(plans: UpdatePlan[], request: UpdateOrchestrationRequest): Promise<{valid: boolean, issues: string[]}> {
  const issues: string[] = [];

  // Check if any plans have critical updates
  const criticalPlans = plans.filter(plan => 
    plan.updates.some(update => update.criticality === 'critical')
  );

  if (criticalPlans.length > 0 && request.updateType === 'scheduled') {
    issues.push(`${criticalPlans.length} servers have critical updates that should be applied immediately`);
  }

  // Check estimated duration vs maintenance window
  if (request.updateType === 'maintenance_window') {
    const maxDuration = Math.max(...plans.map(p => p.estimatedDuration));
    if (maxDuration > 120) { // 2 hours
      issues.push(`Estimated update duration (${maxDuration} minutes) exceeds recommended maintenance window`);
    }
  }

  // Check parallel update limits
  const maxParallel = request.maxParallelUpdates || 3;
  if (plans.length > maxParallel && request.updateType === 'immediate') {
    issues.push(`${plans.length} servers exceed maximum parallel updates (${maxParallel})`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

async function createUpdateJobs(
  supabase: any, 
  plans: UpdatePlan[], 
  request: UpdateOrchestrationRequest
): Promise<any[]> {
  const jobs = [];

  for (const plan of plans) {
    for (const update of plan.updates) {
      // Create individual update job for each component
      const { data: job, error } = await supabase
        .from('update_jobs')
        .insert({
          server_id: plan.serverId,
          firmware_package_id: null, // Will be populated with actual package ID
          status: 'pending',
          scheduled_at: request.scheduledTime || null,
          progress: 0,
          logs: `Planned update: ${update.name} from ${update.currentVersion} to ${update.targetVersion}`,
          created_by: 'system' // Should be actual user ID
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create update job:', error);
      } else {
        jobs.push(job);
      }
    }
  }

  console.log(`Created ${jobs.length} update jobs`);
  return jobs;
}

async function executeImmediateUpdates(
  supabase: any, 
  jobs: any[], 
  request: UpdateOrchestrationRequest
): Promise<any> {
  console.log('Executing immediate updates');

  // Group jobs by server to manage parallel execution
  const jobsByServer = jobs.reduce((acc, job) => {
    if (!acc[job.server_id]) acc[job.server_id] = [];
    acc[job.server_id].push(job);
    return acc;
  }, {});

  const maxParallel = request.maxParallelUpdates || 3;
  const serverIds = Object.keys(jobsByServer);
  
  // Execute updates in batches
  const results = [];
  for (let i = 0; i < serverIds.length; i += maxParallel) {
    const batch = serverIds.slice(i, i + maxParallel);
    
    const batchPromises = batch.map(serverId => 
      executeServerUpdates(supabase, jobsByServer[serverId], request)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
  }

  return {
    type: 'immediate',
    totalBatches: Math.ceil(serverIds.length / maxParallel),
    results: results.length,
    started: new Date().toISOString()
  };
}

async function scheduleUpdates(
  supabase: any, 
  jobs: any[], 
  request: UpdateOrchestrationRequest
): Promise<any> {
  console.log(`Scheduling updates for ${request.scheduledTime}`);

  // Mark all jobs as scheduled
  for (const job of jobs) {
    await supabase
      .from('update_jobs')
      .update({
        status: 'scheduled',
        scheduled_at: request.scheduledTime
      })
      .eq('id', job.id);
  }

  return {
    type: 'scheduled',
    scheduledTime: request.scheduledTime,
    jobsScheduled: jobs.length
  };
}

async function scheduleMaintenanceWindow(
  supabase: any, 
  jobs: any[], 
  request: UpdateOrchestrationRequest
): Promise<any> {
  console.log(`Scheduling updates for maintenance window ${request.maintenanceWindowId}`);

  // In a real implementation, this would:
  // 1. Validate maintenance window exists and is available
  // 2. Calculate optimal update schedule within window
  // 3. Set up automated execution triggers

  return {
    type: 'maintenance_window',
    maintenanceWindowId: request.maintenanceWindowId,
    jobsScheduled: jobs.length
  };
}

async function executeServerUpdates(supabase: any, serverJobs: any[], request: UpdateOrchestrationRequest): Promise<any> {
  // This would execute updates on a single server
  // Implementation would use Redfish API to trigger updates
  console.log(`Executing updates for server ${serverJobs[0]?.server_id}`);
  
  // Mark jobs as running
  for (const job of serverJobs) {
    await supabase
      .from('update_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq('id', job.id);
  }

  // Simulate update process
  // In reality, this would send Redfish commands to the server
  
  return {
    serverId: serverJobs[0]?.server_id,
    jobsStarted: serverJobs.length,
    status: 'started'
  };
}

async function getServerAvailableFirmware(server: any, components: string[]): Promise<any[]> {
  // This would call the server-firmware-check function
  // For now, return mock data
  return [
    {
      component: 'bios',
      name: `${server.model} System BIOS`,
      currentVersion: server.bios_version || '2.18.0',
      availableVersion: '2.19.0',
      criticality: 'recommended',
      rebootRequired: true,
      size: 30 * 1024 * 1024
    }
  ].filter(f => components.includes(f.component));
}

function getEstimatedUpdateTime(component: string, size: number): number {
  // Estimate update time based on component type and size
  const baseTime = {
    bios: 15,      // 15 minutes
    idrac: 10,     // 10 minutes
    storage: 8,    // 8 minutes
    network: 5     // 5 minutes
  };
  
  return baseTime[component as keyof typeof baseTime] || 10;
}

function generatePrerequisites(updates: ComponentUpdate[], server: any): string[] {
  const prerequisites = [];
  
  if (updates.some(u => u.rebootRequired)) {
    prerequisites.push('Ensure server maintenance window is available');
    prerequisites.push('Notify affected users of planned downtime');
  }
  
  if (updates.some(u => u.component === 'bios')) {
    prerequisites.push('Ensure AC power is connected');
    prerequisites.push('Verify current BIOS settings backup');
  }
  
  return prerequisites;
}