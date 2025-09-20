import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkloadAnalysisRequest {
  serverIds: string[];
  daysToAnalyze: number;
  includeVmMetrics?: boolean;
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

    const { serverIds, daysToAnalyze, includeVmMetrics = true }: WorkloadAnalysisRequest = await req.json();

    console.log(`Analyzing workload patterns for ${serverIds.length} servers over ${daysToAnalyze} days`);

    // Fetch servers with VM data
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('*, virtual_machines(*)')
      .in('id', serverIds);

    if (serversError) throw serversError;

    // Fetch operational events for workload analysis
    const { data: events, error: eventsError } = await supabase
      .from('operational_events')
      .select('*')
      .in('server_id', serverIds)
      .gte('created_at', new Date(Date.now() - daysToAnalyze * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (eventsError) throw eventsError;

    // Fetch update history for timing patterns
    const { data: updateJobs, error: jobsError } = await supabase
      .from('update_jobs')
      .select('*')
      .in('server_id', serverIds)
      .gte('created_at', new Date(Date.now() - daysToAnalyze * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    const patterns = [];

    for (const server of servers) {
      const serverEvents = events?.filter(e => e.server_id === server.id) || [];
      const serverJobs = updateJobs?.filter(j => j.server_id === server.id) || [];
      
      // Analyze hourly distribution
      const hourlyDistribution = new Array(24).fill(0);
      const dailyDistribution = new Array(7).fill(0);

      [...serverEvents, ...serverJobs].forEach(item => {
        const timestamp = new Date(item.created_at);
        const hour = timestamp.getHours();
        const dayOfWeek = timestamp.getDay();
        
        hourlyDistribution[hour]++;
        dailyDistribution[dayOfWeek]++;
      });

      // Calculate patterns for each hour
      for (let hour = 0; hour < 24; hour++) {
        const dayPatterns = [];
        
        for (let day = 0; day < 7; day++) {
          // Calculate activity for this specific hour on this day
          const dayHourEvents = [...serverEvents, ...serverJobs].filter(item => {
            const timestamp = new Date(item.created_at);
            return timestamp.getHours() === hour && timestamp.getDay() === day;
          });

          const averageLoad = dayHourEvents.length;
          const peakLoad = Math.max(averageLoad * 1.5, averageLoad);
          
          // Identify critical processes based on event types
          const criticalProcesses = dayHourEvents
            .filter(event => ['system_event', 'firmware_update', 'maintenance'].includes(event.event_type))
            .map(event => event.event_type);

          dayPatterns.push({
            dayOfWeek: day,
            hourOfDay: hour,
            averageLoad,
            peakLoad,
            criticalProcesses: [...new Set(criticalProcesses)] // Remove duplicates
          });
        }

        patterns.push(...dayPatterns);
      }
    }

    // Generate workload insights
    const insights = generateWorkloadInsights(patterns, servers);

    // Log the analysis
    await supabase.from('operational_events').insert({
      event_type: 'workload_analysis',
      event_source: 'workload_pattern_analyzer',
      title: `Workload pattern analysis completed`,
      description: `Analyzed ${daysToAnalyze} days of data for ${serverIds.length} servers`,
      status: 'completed',
      severity: 'info',
      metadata: {
        serverIds,
        daysAnalyzed: daysToAnalyze,
        patternCount: patterns.length,
        insights: insights.summary
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        patterns,
        insights,
        summary: {
          serversAnalyzed: serverIds.length,
          daysAnalyzed: daysToAnalyze,
          totalPatterns: patterns.length,
          lowActivityHours: insights.lowActivityHours,
          peakActivityHours: insights.peakActivityHours
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Workload analysis error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Workload pattern analysis failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateWorkloadInsights(patterns: any[], servers: any[]) {
  // Calculate average load by hour across all servers
  const hourlyAverages = new Array(24).fill(0);
  const hourlyCounts = new Array(24).fill(0);

  patterns.forEach(pattern => {
    hourlyAverages[pattern.hourOfDay] += pattern.averageLoad;
    hourlyCounts[pattern.hourOfDay]++;
  });

  for (let i = 0; i < 24; i++) {
    if (hourlyCounts[i] > 0) {
      hourlyAverages[i] = hourlyAverages[i] / hourlyCounts[i];
    }
  }

  // Identify low and peak activity hours
  const overallAverage = hourlyAverages.reduce((sum, avg) => sum + avg, 0) / 24;
  
  const lowActivityHours = hourlyAverages
    .map((avg, hour) => ({ hour, avg }))
    .filter(({ avg }) => avg < overallAverage * 0.5)
    .map(({ hour }) => hour)
    .sort((a, b) => a - b);

  const peakActivityHours = hourlyAverages
    .map((avg, hour) => ({ hour, avg }))
    .filter(({ avg }) => avg > overallAverage * 1.5)
    .map(({ hour }) => hour)
    .sort((a, b) => a - b);

  // Generate recommendations
  const recommendations = [];
  
  if (lowActivityHours.length > 0) {
    recommendations.push(`Optimal maintenance windows: ${lowActivityHours.map(h => `${h}:00-${h+1}:00`).join(', ')}`);
  }
  
  if (peakActivityHours.length > 0) {
    recommendations.push(`Avoid maintenance during: ${peakActivityHours.map(h => `${h}:00-${h+1}:00`).join(', ')}`);
  }

  // Weekend vs weekday analysis
  const weekdayPatterns = patterns.filter(p => p.dayOfWeek >= 1 && p.dayOfWeek <= 5);
  const weekendPatterns = patterns.filter(p => p.dayOfWeek === 0 || p.dayOfWeek === 6);
  
  const weekdayAvg = weekdayPatterns.reduce((sum, p) => sum + p.averageLoad, 0) / weekdayPatterns.length;
  const weekendAvg = weekendPatterns.reduce((sum, p) => sum + p.averageLoad, 0) / weekendPatterns.length;
  
  if (weekendAvg < weekdayAvg * 0.7) {
    recommendations.push('Weekend maintenance windows show significantly lower activity');
  }

  return {
    lowActivityHours,
    peakActivityHours,
    recommendations,
    hourlyAverages,
    summary: {
      overallAverage: Math.round(overallAverage * 100) / 100,
      weekdayAverage: Math.round(weekdayAvg * 100) / 100,
      weekendAverage: Math.round(weekendAvg * 100) / 100,
      totalServers: servers.length
    }
  };
}