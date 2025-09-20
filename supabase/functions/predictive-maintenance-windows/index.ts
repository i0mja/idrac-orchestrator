import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WindowPredictionRequest {
  serverIds: string[];
  updateDurationEstimate: number;
  constraints: {
    maxDowntimeMinutes?: number;
    requireApproval?: boolean;
    criticalHours?: Array<{ start: string; end: string; description: string }>;
    blackoutDates?: string[];
    preferredDays?: number[];
  };
  predictionModel: 'ml_enhanced' | 'heuristic' | 'historical';
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
      updateDurationEstimate,
      constraints,
      predictionModel
    }: WindowPredictionRequest = await req.json();

    console.log(`Predicting maintenance windows for ${serverIds.length} servers using ${predictionModel} model`);

    // Fetch server data and historical patterns
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select(`
        *,
        virtual_machines(*),
        vcenter_clusters(*),
        server_readiness_checks(*)
      `)
      .in('id', serverIds);

    if (serversError) throw serversError;

    // Fetch historical operational events for workload analysis
    const { data: historicalEvents } = await supabase
      .from('operational_events')
      .select('*')
      .in('server_id', serverIds)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Fetch historical update jobs for timing patterns
    const { data: updateHistory } = await supabase
      .from('update_jobs')
      .select('*')
      .in('server_id', serverIds)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const windows = [];

    for (const server of servers) {
      const serverEvents = historicalEvents?.filter(e => e.server_id === server.id) || [];
      const serverUpdates = updateHistory?.filter(u => u.server_id === server.id) || [];
      
      // Analyze workload patterns
      const workloadAnalysis = analyzeWorkloadPatterns(server, serverEvents);
      
      // Predict optimal windows
      const predictedWindows = await predictOptimalWindows(
        server,
        workloadAnalysis,
        updateDurationEstimate,
        constraints,
        predictionModel
      );

      windows.push(...predictedWindows);
    }

    // Sort windows by confidence score
    const sortedWindows = windows.sort((a, b) => b.confidence - a.confidence);

    // Log the prediction activity
    await supabase.from('operational_events').insert({
      event_type: 'maintenance_window_prediction',
      event_source: 'predictive_maintenance_system',
      title: `Maintenance windows predicted for ${serverIds.length} servers`,
      description: `Generated ${windows.length} window recommendations using ${predictionModel} model`,
      status: 'completed',
      severity: 'info',
      metadata: {
        serverIds,
        windowCount: windows.length,
        predictionModel,
        avgConfidence: windows.reduce((sum, w) => sum + w.confidence, 0) / windows.length
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        windows: sortedWindows,
        summary: {
          totalWindows: windows.length,
          highConfidenceWindows: windows.filter(w => w.confidence > 80).length,
          averageConfidence: Math.round(windows.reduce((sum, w) => sum + w.confidence, 0) / windows.length),
          predictionModel
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Window prediction error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Predictive maintenance window generation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function analyzeWorkloadPatterns(server: any, events: any[]) {
  const patterns = {
    hourlyLoad: new Array(24).fill(0),
    dailyLoad: new Array(7).fill(0),
    peakHours: [],
    lowActivityPeriods: [],
    criticalProcessTimes: []
  };

  // Analyze event distribution by hour and day
  events.forEach(event => {
    const eventTime = new Date(event.created_at);
    const hour = eventTime.getHours();
    const day = eventTime.getDay();
    
    patterns.hourlyLoad[hour]++;
    patterns.dailyLoad[day]++;
  });

  // Identify peak and low activity periods
  const avgHourlyLoad = patterns.hourlyLoad.reduce((sum, load) => sum + load, 0) / 24;
  
  patterns.peakHours = patterns.hourlyLoad
    .map((load, hour) => ({ hour, load }))
    .filter(({ load }) => load > avgHourlyLoad * 1.5)
    .map(({ hour }) => hour);

  patterns.lowActivityPeriods = patterns.hourlyLoad
    .map((load, hour) => ({ hour, load }))
    .filter(({ load }) => load < avgHourlyLoad * 0.5)
    .map(({ hour }) => hour);

  return patterns;
}

async function predictOptimalWindows(
  server: any,
  workloadAnalysis: any,
  updateDuration: number,
  constraints: any,
  predictionModel: string
) {
  const windows = [];
  const now = new Date();
  
  // Generate windows for next 14 days
  for (let days = 1; days <= 14; days++) {
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const dayOfWeek = targetDate.getDay();
    
    // Skip blackout dates
    if (constraints.blackoutDates?.includes(targetDate.toISOString().split('T')[0])) {
      continue;
    }
    
    // Check preferred days
    if (constraints.preferredDays && !constraints.preferredDays.includes(dayOfWeek)) {
      continue;
    }
    
    // Find optimal hours for this day
    const optimalHours = findOptimalHours(workloadAnalysis, constraints, updateDuration);
    
    for (const startHour of optimalHours) {
      const windowStart = new Date(targetDate);
      windowStart.setHours(startHour, 0, 0, 0);
      
      const windowEnd = new Date(windowStart.getTime() + updateDuration * 60 * 1000);
      
      // Calculate confidence and risk
      const windowAnalysis = analyzeWindow(
        server,
        { start: windowStart, end: windowEnd },
        workloadAnalysis,
        predictionModel
      );
      
      if (windowAnalysis.confidence > 30) { // Only include viable windows
        windows.push({
          id: crypto.randomUUID(),
          serverId: server.id,
          suggestedStart: windowStart.toISOString(),
          suggestedEnd: windowEnd.toISOString(),
          confidence: windowAnalysis.confidence,
          riskScore: windowAnalysis.riskScore,
          workloadImpact: windowAnalysis.workloadImpact,
          rationale: windowAnalysis.rationale,
          alternatives: generateAlternatives(windowStart, updateDuration, workloadAnalysis)
        });
      }
    }
  }
  
  return windows.slice(0, 5); // Return top 5 windows per server
}

function findOptimalHours(workloadAnalysis: any, constraints: any, duration: number): number[] {
  const optimalHours = [];
  const criticalHours = constraints.criticalHours || [];
  
  // Prioritize low activity periods
  for (const hour of workloadAnalysis.lowActivityPeriods) {
    // Check if window fits without overlapping critical hours
    const windowEnd = hour + Math.ceil(duration / 60);
    
    let isViable = true;
    for (let h = hour; h < windowEnd && h < 24; h++) {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      const isConflict = criticalHours.some((critical: any) => {
        const criticalStart = critical.start;
        const criticalEnd = critical.end;
        return hourStr >= criticalStart && hourStr <= criticalEnd;
      });
      
      if (isConflict) {
        isViable = false;
        break;
      }
    }
    
    if (isViable) {
      optimalHours.push(hour);
    }
  }
  
  // If no low activity periods work, try early morning hours
  if (optimalHours.length === 0) {
    for (let hour = 2; hour <= 5; hour++) {
      const windowEnd = hour + Math.ceil(duration / 60);
      if (windowEnd <= 24) {
        optimalHours.push(hour);
      }
    }
  }
  
  return optimalHours.slice(0, 3); // Return top 3 optimal hours
}

function analyzeWindow(server: any, window: any, workloadAnalysis: any, predictionModel: string) {
  const startHour = window.start.getHours();
  const endHour = window.end.getHours();
  
  // Base confidence from workload analysis
  let confidence = 70;
  let riskScore = 30;
  const rationale = [];
  
  // Adjust based on workload patterns
  if (workloadAnalysis.lowActivityPeriods.includes(startHour)) {
    confidence += 20;
    riskScore -= 15;
    rationale.push('Window aligns with historically low activity period');
  }
  
  if (workloadAnalysis.peakHours.some((h: number) => h >= startHour && h <= endHour)) {
    confidence -= 25;
    riskScore += 20;
    rationale.push('Window overlaps with peak activity hours');
  }
  
  // Adjust for day of week (weekends typically better)
  const dayOfWeek = window.start.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
    confidence += 10;
    riskScore -= 5;
    rationale.push('Weekend scheduling reduces business impact');
  }
  
  // Adjust for server criticality
  const vmCount = server.virtual_machines?.length || 0;
  if (vmCount > 20) {
    confidence -= 15;
    riskScore += 10;
    rationale.push('High VM count increases maintenance complexity');
  } else if (vmCount < 5) {
    confidence += 10;
    riskScore -= 5;
    rationale.push('Low VM count simplifies maintenance');
  }
  
  // HA cluster considerations
  if (server.vcenter_clusters?.some((c: any) => c.ha_enabled)) {
    confidence += 5;
    riskScore -= 5;
    rationale.push('HA cluster provides update safety');
  }
  
  // Determine workload impact
  let workloadImpact: 'minimal' | 'low' | 'medium' | 'high' = 'minimal';
  if (riskScore > 60) workloadImpact = 'high';
  else if (riskScore > 40) workloadImpact = 'medium';
  else if (riskScore > 20) workloadImpact = 'low';
  
  return {
    confidence: Math.max(0, Math.min(100, confidence)),
    riskScore: Math.max(0, Math.min(100, riskScore)),
    workloadImpact,
    rationale
  };
}

function generateAlternatives(primaryWindow: Date, duration: number, workloadAnalysis: any) {
  const alternatives = [];
  
  // Generate 2 alternative windows
  for (let offset of [1, -1]) {
    const altStart = new Date(primaryWindow.getTime() + offset * 24 * 60 * 60 * 1000);
    const altEnd = new Date(altStart.getTime() + duration * 60 * 1000);
    
    // Simple confidence calculation for alternatives
    const altHour = altStart.getHours();
    let altConfidence = 60;
    
    if (workloadAnalysis.lowActivityPeriods.includes(altHour)) {
      altConfidence += 15;
    }
    
    alternatives.push({
      start: altStart.toISOString(),
      end: altEnd.toISOString(),
      confidence: altConfidence,
      tradeoffs: offset > 0 ? ['Later date may have less preparation time'] : ['Earlier date allows more recovery time']
    });
  }
  
  return alternatives;
}