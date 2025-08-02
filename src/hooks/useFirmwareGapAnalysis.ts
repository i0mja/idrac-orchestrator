import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FirmwareComponent {
  type: 'bios' | 'idrac' | 'storage' | 'nic' | 'raid';
  current_version: string;
  target_version: string;
  criticality: 'critical' | 'important' | 'recommended' | 'optional';
  requires_reboot: boolean;
  estimated_duration_minutes: number;
  dependencies?: string[];
  intermediate_versions?: string[];
}

export interface HostFirmwareGap {
  host_id: string;
  hostname: string;
  cluster_name?: string;
  model: string;
  service_tag: string;
  components: FirmwareComponent[];
  total_update_time_minutes: number;
  requires_multi_step: boolean;
  update_sequence: UpdateStep[];
  compatibility_risk: 'low' | 'medium' | 'high';
}

export interface UpdateStep {
  step_number: number;
  component_type: string;
  from_version: string;
  to_version: string;
  duration_minutes: number;
  requires_reboot: boolean;
  validation_required: boolean;
  dependencies_met: boolean;
}

export interface ClusterCompatibilityAnalysis {
  cluster_name: string;
  total_hosts: number;
  firmware_variations: {
    [component: string]: {
      versions: string[];
      host_count_per_version: { [version: string]: number };
    };
  };
  rolling_update_feasible: boolean;
  max_simultaneous_updates: number;
  estimated_cluster_update_duration_hours: number;
  compatibility_windows: {
    component: string;
    safe_mixed_versions: string[];
    risky_combinations: Array<{ versions: string[]; risk: string }>;
  }[];
}

export function useFirmwareGapAnalysis() {
  const [gapAnalysis, setGapAnalysis] = useState<HostFirmwareGap[]>([]);
  const [clusterAnalysis, setClusterAnalysis] = useState<ClusterCompatibilityAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const analyzeServerFirmwareGaps = async (serverIds: string[]) => {
    setLoading(true);
    try {
      const { data: servers, error: serversError } = await supabase
        .from('servers')
        .select('*')
        .in('id', serverIds);

      if (serversError) throw serversError;

      const gaps: HostFirmwareGap[] = [];
      
      for (const server of servers || []) {
        const gap = await analyzeIndividualServerGap(server);
        gaps.push(gap);
      }

      setGapAnalysis(gaps);
      
      // Group by cluster for cluster analysis
      const clusterGroups = gaps.reduce((acc, gap) => {
        const clusterName = gap.cluster_name || 'standalone';
        if (!acc[clusterName]) acc[clusterName] = [];
        acc[clusterName].push(gap);
        return acc;
      }, {} as { [key: string]: HostFirmwareGap[] });

      const clusterAnalyses = Object.entries(clusterGroups).map(([clusterName, hosts]) =>
        analyzeClusterCompatibility(clusterName, hosts)
      );

      setClusterAnalysis(clusterAnalyses);
      
    } catch (error) {
      console.error('Error analyzing firmware gaps:', error);
      toast({
        title: "Error",
        description: "Failed to analyze firmware gaps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeIndividualServerGap = async (server: any): Promise<HostFirmwareGap> => {
    // Get available firmware packages for this server model
    const { data: packages } = await supabase
      .from('dell_update_packages')
      .select('*')
      .contains('service_tag_compatibility', [server.service_tag])
      .order('release_date', { ascending: false });

    const components: FirmwareComponent[] = [];
    const updateSequence: UpdateStep[] = [];
    let totalTime = 0;
    let stepNumber = 1;

    // Analyze BIOS
    if (server.bios_version) {
      const biosPackages = packages?.filter(p => p.component_type === 'BIOS') || [];
      if (biosPackages.length > 0) {
        const latestBios = biosPackages[0];
        const biosGap = analyzeFirmwareGap(
          'bios',
          server.bios_version,
          latestBios.version,
          (latestBios.criticality as FirmwareComponent['criticality']) || 'recommended',
          true,
          30
        );
        
        if (biosGap.current_version !== biosGap.target_version) {
          components.push(biosGap);
          updateSequence.push({
            step_number: stepNumber++,
            component_type: 'BIOS',
            from_version: biosGap.current_version,
            to_version: biosGap.target_version,
            duration_minutes: biosGap.estimated_duration_minutes,
            requires_reboot: true,
            validation_required: true,
            dependencies_met: true
          });
          totalTime += biosGap.estimated_duration_minutes;
        }
      }
    }

    // Analyze iDRAC
    if (server.idrac_version) {
      const idracPackages = packages?.filter(p => p.component_type === 'iDRAC') || [];
      if (idracPackages.length > 0) {
        const latestIdrac = idracPackages[0];
        const idracGap = analyzeFirmwareGap(
          'idrac',
          server.idrac_version,
          latestIdrac.version,
          (latestIdrac.criticality as FirmwareComponent['criticality']) || 'recommended',
          false,
          15
        );
        
        if (idracGap.current_version !== idracGap.target_version) {
          components.push(idracGap);
          updateSequence.push({
            step_number: stepNumber++,
            component_type: 'iDRAC',
            from_version: idracGap.current_version,
            to_version: idracGap.target_version,
            duration_minutes: idracGap.estimated_duration_minutes,
            requires_reboot: false,
            validation_required: true,
            dependencies_met: true
          });
          totalTime += idracGap.estimated_duration_minutes;
        }
      }
    }

    // Add buffer time for validation and coordination
    totalTime += Math.ceil(components.length * 5); // 5 minutes per component for validation

    const requiresMultiStep = components.some(c => c.intermediate_versions && c.intermediate_versions.length > 0);
    const compatibilityRisk = calculateCompatibilityRisk(components);

    return {
      host_id: server.id,
      hostname: server.hostname,
      cluster_name: server.cluster_name,
      model: server.model || 'Unknown',
      service_tag: server.service_tag || 'Unknown',
      components,
      total_update_time_minutes: totalTime,
      requires_multi_step: requiresMultiStep,
      update_sequence: updateSequence,
      compatibility_risk: compatibilityRisk
    };
  };

  const analyzeFirmwareGap = (
    type: FirmwareComponent['type'],
    currentVersion: string,
    targetVersion: string,
    criticality: FirmwareComponent['criticality'],
    requiresReboot: boolean,
    baseDuration: number
  ): FirmwareComponent => {
    // Check if intermediate versions are needed
    const intermediateVersions = getIntermediateVersions(currentVersion, targetVersion, type);
    const estimatedDuration = baseDuration * (1 + intermediateVersions.length);

    return {
      type,
      current_version: currentVersion,
      target_version: targetVersion,
      criticality,
      requires_reboot: requiresReboot,
      estimated_duration_minutes: estimatedDuration,
      intermediate_versions: intermediateVersions.length > 0 ? intermediateVersions : undefined
    };
  };

  const getIntermediateVersions = (current: string, target: string, type: string): string[] => {
    // Simplified version gap analysis - in reality this would be more complex
    const currentNum = parseVersionNumber(current);
    const targetNum = parseVersionNumber(target);
    
    // If more than 2 major versions apart, require intermediate steps
    if (targetNum - currentNum > 2) {
      return [incrementVersion(current)]; // Simplified - add one intermediate version
    }
    
    return [];
  };

  const parseVersionNumber = (version: string): number => {
    // Extract numeric part from version string (simplified)
    const match = version.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const incrementVersion = (version: string): string => {
    // Simplified version incrementing
    const num = parseVersionNumber(version);
    return version.replace(/\d+/, (num + 1).toString());
  };

  const calculateCompatibilityRisk = (components: FirmwareComponent[]): 'low' | 'medium' | 'high' => {
    const criticalComponents = components.filter(c => c.criticality === 'critical').length;
    const multiStepComponents = components.filter(c => c.intermediate_versions && c.intermediate_versions.length > 0).length;
    
    if (criticalComponents > 2 || multiStepComponents > 1) return 'high';
    if (criticalComponents > 0 || multiStepComponents > 0) return 'medium';
    return 'low';
  };

  const analyzeClusterCompatibility = (
    clusterName: string,
    hosts: HostFirmwareGap[]
  ): ClusterCompatibilityAnalysis => {
    const firmwareVariations: ClusterCompatibilityAnalysis['firmware_variations'] = {};
    
    // Analyze variations for each component type
    ['bios', 'idrac', 'storage', 'nic'].forEach(componentType => {
      const versions: string[] = [];
      const versionCounts: { [version: string]: number } = {};
      
      hosts.forEach(host => {
        const component = host.components.find(c => c.type === componentType);
        if (component) {
          if (!versions.includes(component.current_version)) {
            versions.push(component.current_version);
          }
          versionCounts[component.current_version] = (versionCounts[component.current_version] || 0) + 1;
        }
      });
      
      if (versions.length > 0) {
        firmwareVariations[componentType] = {
          versions,
          host_count_per_version: versionCounts
        };
      }
    });

    // Determine rolling update feasibility
    const maxVariations = Math.max(...Object.values(firmwareVariations).map(v => v.versions.length));
    const rollingUpdateFeasible = maxVariations <= 3; // Can handle up to 3 different versions during rolling update
    
    // Calculate max simultaneous updates based on cluster size and variation
    const maxSimultaneous = Math.max(1, Math.floor(hosts.length / 3)); // Conservative approach
    
    // Estimate total cluster update duration
    const maxHostUpdateTime = Math.max(...hosts.map(h => h.total_update_time_minutes));
    const avgHostUpdateTime = hosts.reduce((sum, h) => sum + h.total_update_time_minutes, 0) / hosts.length;
    const estimatedDurationHours = Math.ceil(
      (hosts.length / maxSimultaneous) * (avgHostUpdateTime / 60) + (maxHostUpdateTime / 60)
    );

    return {
      cluster_name: clusterName,
      total_hosts: hosts.length,
      firmware_variations: firmwareVariations,
      rolling_update_feasible: rollingUpdateFeasible,
      max_simultaneous_updates: maxSimultaneous,
      estimated_cluster_update_duration_hours: estimatedDurationHours,
      compatibility_windows: generateCompatibilityWindows(firmwareVariations)
    };
  };

  const generateCompatibilityWindows = (
    variations: ClusterCompatibilityAnalysis['firmware_variations']
  ): ClusterCompatibilityAnalysis['compatibility_windows'] => {
    return Object.entries(variations).map(([component, data]) => ({
      component,
      safe_mixed_versions: data.versions.slice(0, 2), // First 2 versions are usually safe to mix
      risky_combinations: data.versions.length > 2 ? [{
        versions: data.versions,
        risk: 'Mixing more than 2 firmware versions may cause cluster instability'
      }] : []
    }));
  };

  return {
    gapAnalysis,
    clusterAnalysis,
    loading,
    analyzeServerFirmwareGaps,
  };
}