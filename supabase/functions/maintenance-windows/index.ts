import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MaintenanceWindowRequest {
  action: 'create' | 'update' | 'delete' | 'list' | 'schedule';
  windowId?: string;
  name?: string;
  description?: string;
  startTime: string;
  endTime: string;
  recurrence?: 'none' | 'weekly' | 'monthly';
  affectedSystems: string[];
  approvalRequired?: boolean;
  notificationSettings?: {
    notifyBefore: number; // minutes
    notifyChannels: string[];
  };
}

interface MaintenanceWindow {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  recurrence: string;
  affectedSystems: string[];
  createdBy: string;
  approvedBy?: string;
  approvalRequired: boolean;
  scheduledUpdates?: any[];
  created_at: string;
  updated_at: string;
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
    const request: MaintenanceWindowRequest = await req.json();

    console.log(`Processing maintenance window request: ${request.action}`);

    let result;
    switch (request.action) {
      case 'create':
        result = await createMaintenanceWindow(supabase, request);
        break;
      case 'update':
        result = await updateMaintenanceWindow(supabase, request);
        break;
      case 'delete':
        result = await deleteMaintenanceWindow(supabase, request.windowId!);
        break;
      case 'list':
        result = await listMaintenanceWindows(supabase);
        break;
      case 'schedule':
        result = await scheduleMaintenanceUpdates(supabase, request);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: request.action,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Maintenance window error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process maintenance window request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createMaintenanceWindow(supabase: any, request: MaintenanceWindowRequest): Promise<MaintenanceWindow> {
  console.log(`Creating maintenance window: ${request.name}`);

  // Validate time window
  const startTime = new Date(request.startTime);
  const endTime = new Date(request.endTime);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

  if (duration <= 0) {
    throw new Error('End time must be after start time');
  }

  if (duration > 480) { // 8 hours
    throw new Error('Maintenance window cannot exceed 8 hours');
  }

  // Check for conflicts with existing windows
  const conflicts = await checkWindowConflicts(supabase, startTime, endTime, request.affectedSystems);
  if (conflicts.length > 0) {
    throw new Error(`Conflicting maintenance windows found: ${conflicts.map(c => c.name).join(', ')}`);
  }

  // Validate affected systems exist
  const { data: systems, error: systemsError } = await supabase
    .from('servers')
    .select('id, hostname')
    .in('id', request.affectedSystems);

  if (systemsError || !systems || systems.length !== request.affectedSystems.length) {
    throw new Error('Some affected systems not found');
  }

  // Create maintenance window record
  const windowData = {
    id: crypto.randomUUID(),
    name: request.name,
    description: request.description || '',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration,
    status: 'scheduled',
    recurrence: request.recurrence || 'none',
    affected_systems: request.affectedSystems,
    created_by: 'system', // Should be actual user ID
    approval_required: request.approvalRequired || false,
    notification_settings: request.notificationSettings || {
      notifyBefore: 30,
      notifyChannels: ['email']
    }
  };

  // Store in system_config table for now (would create dedicated table in production)
  const { error: insertError } = await supabase
    .from('system_config')
    .insert({
      key: `maintenance_window_${windowData.id}`,
      value: windowData,
      description: `Maintenance window: ${request.name}`
    });

  if (insertError) {
    throw new Error(`Failed to create maintenance window: ${insertError.message}`);
  }

  // Schedule notifications
  await scheduleMaintenanceNotifications(supabase, windowData);

  console.log(`Created maintenance window ${windowData.id} for ${duration} minutes`);

  return {
    id: windowData.id,
    name: windowData.name,
    description: windowData.description,
    startTime: windowData.start_time,
    endTime: windowData.end_time,
    duration: windowData.duration,
    status: windowData.status as any,
    recurrence: windowData.recurrence,
    affectedSystems: windowData.affected_systems,
    createdBy: windowData.created_by,
    approvalRequired: windowData.approval_required,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function updateMaintenanceWindow(supabase: any, request: MaintenanceWindowRequest): Promise<MaintenanceWindow> {
  if (!request.windowId) {
    throw new Error('Window ID required for update');
  }

  console.log(`Updating maintenance window: ${request.windowId}`);

  // Get existing window
  const { data: existingConfig, error: getError } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', `maintenance_window_${request.windowId}`)
    .single();

  if (getError || !existingConfig) {
    throw new Error('Maintenance window not found');
  }

  const existingWindow = existingConfig.value;

  // Update fields
  const updates: any = {
    ...existingWindow,
    updated_at: new Date().toISOString()
  };

  if (request.name) updates.name = request.name;
  if (request.description) updates.description = request.description;
  if (request.startTime) updates.start_time = request.startTime;
  if (request.endTime) updates.end_time = request.endTime;
  if (request.affectedSystems) updates.affected_systems = request.affectedSystems;

  // Recalculate duration if times changed
  if (request.startTime || request.endTime) {
    const startTime = new Date(updates.start_time);
    const endTime = new Date(updates.end_time);
    updates.duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  const { error: updateError } = await supabase
    .from('system_config')
    .update({ value: updates })
    .eq('key', `maintenance_window_${request.windowId}`);

  if (updateError) {
    throw new Error(`Failed to update maintenance window: ${updateError.message}`);
  }

  return {
    id: updates.id,
    name: updates.name,
    description: updates.description,
    startTime: updates.start_time,
    endTime: updates.end_time,
    duration: updates.duration,
    status: updates.status,
    recurrence: updates.recurrence,
    affectedSystems: updates.affected_systems,
    createdBy: updates.created_by,
    approvalRequired: updates.approval_required,
    created_at: updates.created_at,
    updated_at: updates.updated_at
  };
}

async function deleteMaintenanceWindow(supabase: any, windowId: string): Promise<{deleted: boolean}> {
  console.log(`Deleting maintenance window: ${windowId}`);

  const { error } = await supabase
    .from('system_config')
    .delete()
    .eq('key', `maintenance_window_${windowId}`);

  if (error) {
    throw new Error(`Failed to delete maintenance window: ${error.message}`);
  }

  return { deleted: true };
}

async function listMaintenanceWindows(supabase: any): Promise<MaintenanceWindow[]> {
  console.log('Listing maintenance windows');

  const { data: configs, error } = await supabase
    .from('system_config')
    .select('*')
    .like('key', 'maintenance_window_%');

  if (error) {
    throw new Error(`Failed to list maintenance windows: ${error.message}`);
  }

  const windows = configs.map((config: any) => {
    const window = config.value;
    return {
      id: window.id,
      name: window.name,
      description: window.description,
      startTime: window.start_time,
      endTime: window.end_time,
      duration: window.duration,
      status: window.status,
      recurrence: window.recurrence,
      affectedSystems: window.affected_systems,
      createdBy: window.created_by,
      approvalRequired: window.approval_required,
      created_at: window.created_at || config.created_at,
      updated_at: window.updated_at || config.updated_at
    };
  });

  // Sort by start time
  windows.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return windows;
}

async function scheduleMaintenanceUpdates(supabase: any, request: MaintenanceWindowRequest): Promise<any> {
  if (!request.windowId) {
    throw new Error('Window ID required for scheduling');
  }

  console.log(`Scheduling updates for maintenance window: ${request.windowId}`);

  // Get maintenance window
  const { data: windowConfig, error: windowError } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', `maintenance_window_${request.windowId}`)
    .single();

  if (windowError || !windowConfig) {
    throw new Error('Maintenance window not found');
  }

  const window = windowConfig.value;

  // Get pending update jobs for affected systems
  const { data: pendingJobs, error: jobsError } = await supabase
    .from('update_jobs')
    .select('*')
    .in('server_id', window.affected_systems)
    .eq('status', 'pending');

  if (jobsError) {
    throw new Error('Failed to get pending update jobs');
  }

  // Schedule jobs within the maintenance window
  const scheduledJobs = [];
  let currentTime = new Date(window.start_time);
  const endTime = new Date(window.end_time);

  for (const job of pendingJobs || []) {
    // Estimate job duration (would be more sophisticated in reality)
    const estimatedDuration = 15; // 15 minutes per job
    const jobEndTime = new Date(currentTime.getTime() + estimatedDuration * 60000);

    if (jobEndTime <= endTime) {
      // Schedule this job
      const { error: updateError } = await supabase
        .from('update_jobs')
        .update({
          status: 'scheduled',
          scheduled_at: currentTime.toISOString()
        })
        .eq('id', job.id);

      if (!updateError) {
        scheduledJobs.push({
          jobId: job.id,
          serverId: job.server_id,
          scheduledAt: currentTime.toISOString(),
          estimatedDuration
        });

        currentTime = new Date(jobEndTime.getTime() + 5 * 60000); // 5 minute buffer
      }
    }
  }

  return {
    windowId: request.windowId,
    scheduledJobs: scheduledJobs.length,
    totalDuration: Math.round((currentTime.getTime() - new Date(window.start_time).getTime()) / (1000 * 60)),
    jobs: scheduledJobs
  };
}

async function checkWindowConflicts(
  supabase: any, 
  startTime: Date, 
  endTime: Date, 
  affectedSystems: string[]
): Promise<any[]> {
  // Get all existing maintenance windows
  const { data: configs, error } = await supabase
    .from('system_config')
    .select('*')
    .like('key', 'maintenance_window_%');

  if (error || !configs) {
    return [];
  }

  const conflicts = [];
  for (const config of configs) {
    const window = config.value;
    const windowStart = new Date(window.start_time);
    const windowEnd = new Date(window.end_time);

    // Check time overlap
    const timeOverlap = startTime < windowEnd && endTime > windowStart;
    
    // Check system overlap
    const systemOverlap = window.affected_systems.some((sys: string) => affectedSystems.includes(sys));

    if (timeOverlap && systemOverlap && window.status === 'scheduled') {
      conflicts.push(window);
    }
  }

  return conflicts;
}

async function scheduleMaintenanceNotifications(supabase: any, window: any): Promise<void> {
  // In a real implementation, this would:
  // 1. Create notification jobs in a queue
  // 2. Set up email/SMS notifications
  // 3. Integrate with calendar systems
  // 4. Create dashboard alerts

  console.log(`Scheduled notifications for maintenance window ${window.id}`);
}