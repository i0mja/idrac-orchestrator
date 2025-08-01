import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DellUpdatePackage {
  id: string;
  package_name: string;
  version: string;
  component_type: 'bios' | 'idrac' | 'nic' | 'storage' | 'drives';
  service_tag_compatibility: string[];
  esxi_version_compatibility: string[];
  file_path?: string;
  file_size?: number;
  checksum_md5?: string;
  checksum_sha256?: string;
  dell_part_number?: string;
  release_date?: string;
  criticality: 'critical' | 'recommended' | 'optional';
  requires_reboot: boolean;
  update_sequence_order: number;
  dependencies: string[];
  known_issues?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateSequencePlan {
  id: string;
  name: string;
  cluster_id?: string;
  server_ids: string[];
  update_sequence: UpdateStep[];
  vmware_settings?: VMwareSettings;
  safety_checks: SafetyChecks;
  rollback_plan?: RollbackStep[];
  status: 'planned' | 'running' | 'paused' | 'completed' | 'failed';
  current_step: number;
  total_steps: number;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateStep {
  step_number: number;
  component_type: string;
  package_id: string;
  estimated_duration_minutes: number;
  requires_maintenance_mode: boolean;
  pre_checks: string[];
  post_checks: string[];
}

export interface VMwareSettings {
  enable_maintenance_mode: boolean;
  evacuate_vms: boolean;
  drs_enabled: boolean;
  migration_policy: 'automatic' | 'manual';
  max_concurrent_hosts: number;
  wait_for_vm_migration: boolean;
}

export interface SafetyChecks {
  verify_backups: boolean;
  check_vmware_compatibility: boolean;
  validate_checksums: boolean;
  ensure_cluster_health: boolean;
  minimum_healthy_hosts: number;
  max_downtime_minutes: number;
}

export interface RollbackStep {
  step_number: number;
  action: string;
  component: string;
  rollback_package_id?: string;
}

export function useDellEnterprise() {
  const [dellPackages, setDellPackages] = useState<DellUpdatePackage[]>([]);
  const [orchestrationPlans, setOrchestrationPlans] = useState<UpdateSequencePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDellPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('dell_update_packages')
        .select('*')
        .order('update_sequence_order');

      if (error) throw error;
      setDellPackages((data || []) as DellUpdatePackage[]);
    } catch (error) {
      console.error('Error fetching Dell packages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Dell update packages",
        variant: "destructive",
      });
    }
  };

  const fetchOrchestrationPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('update_orchestration_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrchestrationPlans((data || []) as unknown as UpdateSequencePlan[]);
    } catch (error) {
      console.error('Error fetching orchestration plans:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orchestration plans",
        variant: "destructive",
      });
    }
  };

  const createDellPackage = async (packageData: Partial<DellUpdatePackage>) => {
    try {
      const { data, error } = await supabase
        .from('dell_update_packages')
        .insert([packageData as any])
        .select()
        .single();

      if (error) throw error;
      
      await fetchDellPackages();
      toast({
        title: "Success",
        description: "Dell update package created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating Dell package:', error);
      toast({
        title: "Error",
        description: "Failed to create Dell update package",
        variant: "destructive",
      });
    }
  };

  const createOrchestrationPlan = async (planData: Partial<UpdateSequencePlan>) => {
    try {
      // Generate proper update sequence based on Dell best practices
      const updateSequence = generateUpdateSequence(planData.server_ids || [], dellPackages);
      
      const plan = {
        ...planData,
        update_sequence: updateSequence,
        total_steps: updateSequence.length,
        status: 'planned' as const
      };

      const { data, error } = await supabase
        .from('update_orchestration_plans')
        .insert([plan as any])
        .select()
        .single();

      if (error) throw error;
      
      await fetchOrchestrationPlans();
      toast({
        title: "Success",
        description: "Orchestration plan created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating orchestration plan:', error);
      toast({
        title: "Error",
        description: "Failed to create orchestration plan",
        variant: "destructive",
      });
    }
  };

  const generateUpdateSequence = (serverIds: string[], packages: DellUpdatePackage[]): UpdateStep[] => {
    // Dell recommended update order: iDRAC → Storage Controllers → NICs → BIOS → Drives
    const sequenceOrder = ['idrac', 'storage', 'nic', 'bios', 'drives'];
    const steps: UpdateStep[] = [];
    let stepNumber = 1;

    sequenceOrder.forEach(componentType => {
      const componentPackages = packages.filter(pkg => 
        pkg.component_type === componentType && 
        pkg.criticality !== 'optional'
      );

      componentPackages.forEach(pkg => {
        steps.push({
          step_number: stepNumber++,
          component_type: componentType,
          package_id: pkg.id,
          estimated_duration_minutes: getEstimatedDuration(componentType),
          requires_maintenance_mode: componentType === 'bios' || componentType === 'idrac',
          pre_checks: getPreChecks(componentType),
          post_checks: getPostChecks(componentType)
        });
      });
    });

    return steps;
  };

  const getEstimatedDuration = (componentType: string): number => {
    const durations = {
      idrac: 15,
      storage: 20,
      nic: 10,
      bios: 25,
      drives: 30
    };
    return durations[componentType as keyof typeof durations] || 15;
  };

  const getPreChecks = (componentType: string): string[] => {
    const baseChecks = [
      'Verify server health',
      'Check backup status',
      'Validate maintenance window'
    ];

    const componentChecks = {
      idrac: [...baseChecks, 'Test iDRAC connectivity', 'Export iDRAC config'],
      bios: [...baseChecks, 'Export BIOS profile', 'Check VM migration status'],
      storage: [...baseChecks, 'Verify storage health', 'Check RAID status'],
      nic: [...baseChecks, 'Check network redundancy'],
      drives: [...baseChecks, 'Verify drive health', 'Check storage capacity']
    };

    return componentChecks[componentType as keyof typeof componentChecks] || baseChecks;
  };

  const getPostChecks = (componentType: string): string[] => {
    const baseChecks = [
      'Verify update success',
      'Check system health',
      'Test basic functionality'
    ];

    const componentChecks = {
      idrac: [...baseChecks, 'Test iDRAC access', 'Verify version'],
      bios: [...baseChecks, 'Check POST process', 'Verify settings retention'],
      storage: [...baseChecks, 'Verify RAID status', 'Check drive recognition'],
      nic: [...baseChecks, 'Test network connectivity', 'Verify link speeds'],
      drives: [...baseChecks, 'Check drive health', 'Verify performance']
    };

    return componentChecks[componentType as keyof typeof componentChecks] || baseChecks;
  };

  const validateCompatibility = async (serverId: string, packageId: string): Promise<boolean> => {
    try {
      // Get server details
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .select('*')
        .eq('id', serverId)
        .single();

      if (serverError) throw serverError;

      // Get package details
      const { data: pkg, error: packageError } = await supabase
        .from('dell_update_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError) throw packageError;

      // Check service tag compatibility
      if (pkg.service_tag_compatibility && pkg.service_tag_compatibility.length > 0) {
        if (!server.service_tag || !pkg.service_tag_compatibility.includes(server.service_tag)) {
          return false;
        }
      }

      // Check ESXi version compatibility
      if (pkg.esxi_version_compatibility && pkg.esxi_version_compatibility.length > 0) {
        // This would need ESXi version detection - for now return true
        // In real implementation, you'd check the server's ESXi version
      }

      return true;
    } catch (error) {
      console.error('Error validating compatibility:', error);
      return false;
    }
  };

  const executeOrchestrationPlan = async (planId: string) => {
    try {
      // Update plan status to running
      await supabase
        .from('update_orchestration_plans')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          current_step: 1
        })
        .eq('id', planId);

      // In a real implementation, this would trigger the actual update process
      // via edge functions and handle the VMware integration
      
      toast({
        title: "Orchestration Started",
        description: "Update orchestration plan is now executing",
      });

      await fetchOrchestrationPlans();
    } catch (error) {
      console.error('Error executing orchestration plan:', error);
      toast({
        title: "Error",
        description: "Failed to execute orchestration plan",
        variant: "destructive",
      });
    }
  };

  const pauseOrchestrationPlan = async (planId: string) => {
    try {
      await supabase
        .from('update_orchestration_plans')
        .update({ status: 'paused' })
        .eq('id', planId);

      toast({
        title: "Orchestration Paused",
        description: "Update orchestration plan has been paused",
      });

      await fetchOrchestrationPlans();
    } catch (error) {
      console.error('Error pausing orchestration plan:', error);
      toast({
        title: "Error",
        description: "Failed to pause orchestration plan",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDellPackages(), fetchOrchestrationPlans()]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscriptions
    const dellPackagesSubscription = supabase
      .channel('dell_packages_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'dell_update_packages' },
        () => fetchDellPackages()
      )
      .subscribe();

    const orchestrationSubscription = supabase
      .channel('orchestration_plans_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'update_orchestration_plans' },
        () => fetchOrchestrationPlans()
      )
      .subscribe();

    return () => {
      dellPackagesSubscription.unsubscribe();
      orchestrationSubscription.unsubscribe();
    };
  }, []);

  return {
    dellPackages,
    orchestrationPlans,
    loading,
    createDellPackage,
    createOrchestrationPlan,
    executeOrchestrationPlan,
    pauseOrchestrationPlan,
    validateCompatibility,
    refreshData: () => Promise.all([fetchDellPackages(), fetchOrchestrationPlans()])
  };
}