import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RiskAnalysisRequest {
  serverIds: string[];
  analysisType: 'risk_assessment' | 'readiness_check' | 'dependency_analysis';
  includeWorkloadAnalysis?: boolean;
  historicalDays?: number;
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

    const { serverIds, analysisType, includeWorkloadAnalysis = true, historicalDays = 30 }: RiskAnalysisRequest = await req.json();

    console.log(`Starting ${analysisType} for ${serverIds.length} servers`);

    // Fetch server details with recent health checks
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select(`
        *,
        server_readiness_checks(*),
        health_check_results(*),
        virtual_machines(*),
        vcenter_clusters(*)
      `)
      .in('id', serverIds);

    if (serversError) throw serversError;

    // Fetch recent operational events for risk assessment
    const { data: recentEvents } = await supabase
      .from('operational_events')
      .select('*')
      .in('server_id', serverIds)
      .gte('created_at', new Date(Date.now() - historicalDays * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Fetch update history for pattern analysis
    const { data: updateHistory } = await supabase
      .from('update_jobs')
      .select('*')
      .in('server_id', serverIds)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const riskAssessments = servers?.map(server => {
      const recentChecks = server.server_readiness_checks || [];
      const serverEvents = recentEvents?.filter(event => event.server_id === server.id) || [];
      const serverUpdates = updateHistory?.filter(job => job.server_id === server.id) || [];

      // Calculate risk factors
      const riskFactors = {
        criticalWorkloads: server.virtual_machines?.some((vm: any) => vm.power_state === 'poweredOn') || false,
        highAvailability: server.vcenter_clusters?.some((cluster: any) => cluster.ha_enabled) || false,
        recentChanges: serverEvents.filter(event => 
          event.event_type === 'firmware_update' || event.event_type === 'configuration_change'
        ).length > 0,
        firmwareComplexity: determineFirmwareComplexity(server),
        dependencyCount: server.virtual_machines?.length || 0
      };

      // Calculate base risk score
      let riskScore = 0;
      
      if (riskFactors.criticalWorkloads) riskScore += 25;
      if (riskFactors.highAvailability) riskScore += 20;
      if (riskFactors.recentChanges) riskScore += 15;
      if (riskFactors.firmwareComplexity === 'high') riskScore += 20;
      else if (riskFactors.firmwareComplexity === 'medium') riskScore += 10;
      if (riskFactors.dependencyCount > 10) riskScore += 15;
      else if (riskFactors.dependencyCount > 5) riskScore += 10;

      // Factor in recent update success rate
      const recentFailures = serverUpdates.filter(job => job.status === 'failed').length;
      const totalRecent = serverUpdates.length;
      if (totalRecent > 0) {
        const failureRate = recentFailures / totalRecent;
        riskScore += failureRate * 30;
      }

      // Adjust based on readiness checks
      const latestReadiness = recentChecks[0];
      if (latestReadiness) {
        if (latestReadiness.overall_readiness === 'not_ready') riskScore += 20;
        else if (latestReadiness.overall_readiness === 'ready_with_warnings') riskScore += 10;
        riskScore = Math.max(0, riskScore - (latestReadiness.readiness_score || 0) / 10);
      }

      riskScore = Math.min(100, Math.max(0, riskScore));

      // Generate recommendations
      const recommendations = generateRecommendations(riskFactors, riskScore, latestReadiness);

      // Suggest optimal maintenance window
      const suggestedWindow = suggestMaintenanceWindow(server, riskFactors, serverEvents);

      return {
        serverId: server.id,
        riskScore: Math.round(riskScore),
        riskFactors,
        recommendations,
        suggestedWindow,
        metadata: {
          recentEvents: serverEvents.length,
          updateHistory: serverUpdates.length,
          vmCount: server.virtual_machines?.length || 0,
          readinessScore: latestReadiness?.readiness_score || 0
        }
      };
    }) || [];

    // Log the analysis
    await supabase.from('operational_events').insert({
      event_type: 'risk_analysis',
      event_source: 'intelligent_update_system',
      title: `Risk analysis completed for ${serverIds.length} servers`,
      description: `Generated risk assessments with average risk score: ${
        riskAssessments.reduce((sum, r) => sum + r.riskScore, 0) / riskAssessments.length
      }%`,
      status: 'completed',
      severity: 'info',
      metadata: {
        serverIds,
        analysisType,
        totalServers: serverIds.length,
        highRiskCount: riskAssessments.filter(r => r.riskScore > 70).length
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        riskAssessments,
        summary: {
          totalServers: serverIds.length,
          averageRiskScore: Math.round(riskAssessments.reduce((sum, r) => sum + r.riskScore, 0) / riskAssessments.length),
          highRiskCount: riskAssessments.filter(r => r.riskScore > 70).length,
          lowRiskCount: riskAssessments.filter(r => r.riskScore < 30).length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Risk analysis error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Risk analysis failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
});

function determineFirmwareComplexity(server: any): 'low' | 'medium' | 'high' {
  // Analyze server model and components to determine complexity
  const model = server.model?.toLowerCase() || '';
  const componentCount = (server.bios_version ? 1 : 0) + 
                        (server.idrac_version ? 1 : 0) + 
                        (server.nic_firmware ? 1 : 0);
  
  if (model.includes('poweredge') && model.includes('r7')) return 'high';
  if (componentCount > 3) return 'high';
  if (componentCount > 1) return 'medium';
  return 'low';
}

function generateRecommendations(riskFactors: any, riskScore: number, readinessCheck: any): string[] {
  const recommendations = [];

  if (riskScore > 70) {
    recommendations.push('Consider postponing update until risk factors are addressed');
    recommendations.push('Perform comprehensive backup before proceeding');
  }

  if (riskFactors.criticalWorkloads) {
    recommendations.push('Schedule during low-traffic hours to minimize impact');
    recommendations.push('Ensure VM migration capabilities are available');
  }

  if (riskFactors.highAvailability) {
    recommendations.push('Coordinate with HA cluster maintenance procedures');
    recommendations.push('Verify cluster health before proceeding');
  }

  if (riskFactors.recentChanges) {
    recommendations.push('Allow system to stabilize before firmware updates');
    recommendations.push('Review recent change logs for conflicts');
  }

  if (readinessCheck?.blocking_issues?.length > 0) {
    recommendations.push('Resolve blocking readiness issues first');
  }

  if (riskScore < 30) {
    recommendations.push('Server is well-prepared for firmware updates');
    recommendations.push('Standard update procedures should be sufficient');
  }

  return recommendations;
}

function suggestMaintenanceWindow(server: any, riskFactors: any, recentEvents: any[]): any {
  // Simple heuristic for maintenance window suggestion
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Suggest early morning hours (2-4 AM) for lowest impact
  const suggestedStart = new Date(tomorrow);
  suggestedStart.setHours(2, 0, 0, 0);
  
  const duration = riskFactors.firmwareComplexity === 'high' ? 90 : 
                  riskFactors.firmwareComplexity === 'medium' ? 60 : 30;

  return {
    start: suggestedStart.toISOString(),
    duration,
    rationale: 'Suggested based on low-traffic hours and risk assessment'
  };
}