import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class MaintenanceScheduler {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async checkScheduledWindows(): Promise<{ processed: number; started: number; notifications: number }> {
    try {
      console.log('Checking for scheduled maintenance windows...');

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 8);

      // Find windows that should start now (within 5 minute window)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toTimeString().slice(0, 8);
      
      const { data: windowsToStart, error: startError } = await this.supabase
        .from('maintenance_windows')
        .select(`
          *,
          datacenters (name, location, timezone)
        `)
        .eq('scheduled_date', currentDate)
        .eq('status', 'scheduled')
        .gte('start_time', fiveMinutesAgo)
        .lte('start_time', currentTime);

      if (startError) throw startError;

      // Find windows needing notifications
      const { data: windowsForNotification, error: notifError } = await this.supabase
        .from('maintenance_windows')
        .select(`
          *,
          datacenters (name, location, timezone)
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_date', currentDate);

      if (notifError) throw notifError;

      let startedCount = 0;
      let notificationCount = 0;

      // Start maintenance windows
      for (const window of windowsToStart || []) {
        console.log(`Starting maintenance window: ${window.name}`);
        
        try {
          // Trigger maintenance orchestrator
          const response = await this.supabase.functions.invoke('maintenance-orchestrator', {
            body: {
              action: 'execute_maintenance',
              window_id: window.id
            }
          });

          if (response.error) {
            console.error(`Failed to start maintenance window ${window.id}:`, response.error);
            
            // Mark as failed
            await this.supabase
              .from('maintenance_windows')
              .update({ status: 'cancelled' })
              .eq('id', window.id);

            await this.createSystemEvent(
              'maintenance_start_failed',
              `Failed to Start Maintenance: ${window.name}`,
              `Error: ${response.error.message}`,
              'error',
              { window_id: window.id, error: response.error }
            );
          } else {
            startedCount++;
            console.log(`Successfully started maintenance window: ${window.name}`);
          }
        } catch (error) {
          console.error(`Error starting maintenance window ${window.id}:`, error);
        }
      }

      // Send notifications for upcoming windows
      for (const window of windowsForNotification || []) {
        const shouldNotify = await this.shouldSendNotification(window, now);
        
        if (shouldNotify) {
          await this.sendMaintenanceNotification(window);
          notificationCount++;
        }
      }

      // Handle recurring windows
      await this.processRecurringWindows();

      console.log(`Scheduler run completed: ${startedCount} windows started, ${notificationCount} notifications sent`);

      return {
        processed: (windowsToStart?.length || 0) + (windowsForNotification?.length || 0),
        started: startedCount,
        notifications: notificationCount
      };

    } catch (error) {
      console.error('Maintenance scheduler error:', error);
      throw error;
    }
  }

  private async shouldSendNotification(window: any, now: Date): Promise<boolean> {
    const scheduledDateTime = new Date(`${window.scheduled_date}T${window.start_time}`);
    const hoursUntilMaintenance = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Check if we're within the notification window
    const notificationHours = window.notification_hours_before || 24;
    
    if (hoursUntilMaintenance <= notificationHours && hoursUntilMaintenance > 0) {
      // Check if we've already sent a notification for this window
      const { data: existingNotification } = await this.supabase
        .from('system_events')
        .select('id')
        .eq('event_type', 'maintenance_notification_sent')
        .contains('metadata', { window_id: window.id })
        .single();

      return !existingNotification;
    }

    return false;
  }

  private async sendMaintenanceNotification(window: any) {
    try {
      console.log(`Sending notification for maintenance window: ${window.name}`);

      const scheduledDateTime = new Date(`${window.scheduled_date}T${window.start_time}`);
      const hoursUntil = Math.round((scheduledDateTime.getTime() - Date.now()) / (1000 * 60 * 60));

      const message = `Maintenance window "${window.name}" is scheduled to start in ${hoursUntil} hours at ${window.start_time} on ${window.scheduled_date}. Datacenter: ${window.datacenters?.name || 'Unknown'}`;

      // Create system event for notification
      await this.createSystemEvent(
        'maintenance_notification_sent',
        `Maintenance Notification: ${window.name}`,
        message,
        'info',
        { 
          window_id: window.id,
          hours_until: hoursUntil,
          scheduled_time: scheduledDateTime.toISOString()
        }
      );

      // Here you could integrate with email/Slack/Teams notifications
      // For now, we're just creating system events

      console.log(`Notification sent for maintenance window: ${window.name}`);
      
    } catch (error) {
      console.error(`Failed to send notification for maintenance window ${window.id}:`, error);
    }
  }

  private async processRecurringWindows() {
    try {
      const { data: recurringWindows, error } = await this.supabase
        .from('maintenance_windows')
        .select('*')
        .eq('status', 'completed')
        .neq('recurrence', 'none')
        .not('next_occurrence', 'is', null);

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];

      for (const window of recurringWindows || []) {
        if (window.next_occurrence && window.next_occurrence <= today) {
          console.log(`Creating next occurrence for recurring window: ${window.name}`);

          // Calculate next occurrence
          let nextDate = new Date(window.next_occurrence);
          switch (window.recurrence) {
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextDate.setMonth(nextDate.getMonth() + 3);
              break;
          }

          // Create new window for next occurrence
          const { error: insertError } = await this.supabase
            .from('maintenance_windows')
            .insert({
              name: window.name,
              description: window.description,
              datacenter_id: window.datacenter_id,
              scheduled_date: window.next_occurrence,
              start_time: window.start_time,
              end_time: window.end_time,
              max_concurrent_updates: window.max_concurrent_updates,
              recurrence: window.recurrence,
              next_occurrence: nextDate.toISOString().split('T')[0],
              notification_hours_before: window.notification_hours_before,
              status: 'scheduled'
            });

          if (insertError) {
            console.error(`Failed to create recurring window:`, insertError);
          } else {
            // Update original window to remove next_occurrence
            await this.supabase
              .from('maintenance_windows')
              .update({ next_occurrence: null })
              .eq('id', window.id);

            console.log(`Created next occurrence for: ${window.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing recurring windows:', error);
    }
  }

  private async createSystemEvent(type: string, title: string, description: string, severity: string, metadata: any) {
    await this.supabase
      .from('system_events')
      .insert({
        event_type: type,
        title,
        description,
        severity,
        metadata
      });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const scheduler = new MaintenanceScheduler();
    const result = await scheduler.checkScheduledWindows();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Maintenance scheduler completed successfully',
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Maintenance scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});