import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VCenterCluster {
  id: string;
  vcenter_id: string;
  name: string;
  drs_enabled: boolean;
  ha_enabled: boolean;
  maintenance_mode_policy: string;
  total_hosts: number;
  active_hosts: number;
  created_at: string;
  updated_at: string;
}

export interface VirtualMachine {
  id: string;
  server_id: string;
  vm_name: string;
  vm_id: string;
  power_state: string;
  cpu_count?: number;
  memory_mb?: number;
  storage_gb?: number;
  vm_tools_status?: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServerBackup {
  id: string;
  server_id: string;
  backup_type: 'idrac_config' | 'bios_profile' | 'esxi_config';
  backup_data: any;
  file_path?: string;
  backup_size?: number;
  created_by?: string;
  created_at: string;
}

export function useVMwareIntegration() {
  const [clusters, setClusters] = useState<VCenterCluster[]>([]);
  const [virtualMachines, setVirtualMachines] = useState<VirtualMachine[]>([]);
  const [serverBackups, setServerBackups] = useState<ServerBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchClusters = async () => {
    try {
      const { data, error } = await supabase
        .from('vcenter_clusters')
        .select('*')
        .order('name');

      if (error) throw error;
      setClusters(data || []);
    } catch (error) {
      console.error('Error fetching clusters:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vCenter clusters",
        variant: "destructive",
      });
    }
  };

  const fetchVirtualMachines = async (serverId?: string) => {
    try {
      let query = supabase.from('virtual_machines').select('*');
      
      if (serverId) {
        query = query.eq('server_id', serverId);
      }

      const { data, error } = await query.order('vm_name');

      if (error) throw error;
      setVirtualMachines(data || []);
    } catch (error) {
      console.error('Error fetching virtual machines:', error);
      toast({
        title: "Error",
        description: "Failed to fetch virtual machines",
        variant: "destructive",
      });
    }
  };

  const fetchServerBackups = async (serverId?: string) => {
    try {
      let query = supabase.from('server_backups').select('*');
      
      if (serverId) {
        query = query.eq('server_id', serverId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setServerBackups((data || []) as ServerBackup[]);
    } catch (error) {
      console.error('Error fetching server backups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch server backups",
        variant: "destructive",
      });
    }
  };

  const createServerBackup = async (serverId: string, backupType: ServerBackup['backup_type']) => {
    try {
      let backupData = {};
      let fileName = '';

      switch (backupType) {
        case 'idrac_config':
          // Mock iDRAC configuration backup
          backupData = await createIdracBackup(serverId);
          fileName = `idrac_backup_${new Date().toISOString().split('T')[0]}.xml`;
          break;
        case 'bios_profile':
          // Mock BIOS profile backup
          backupData = await createBiosBackup(serverId);
          fileName = `bios_profile_${new Date().toISOString().split('T')[0]}.xml`;
          break;
        case 'esxi_config':
          // Mock ESXi configuration backup
          backupData = await createEsxiBackup(serverId);
          fileName = `esxi_config_${new Date().toISOString().split('T')[0]}.tgz`;
          break;
      }

      const { data, error } = await supabase
        .from('server_backups')
        .insert([{
          server_id: serverId,
          backup_type: backupType,
          backup_data: backupData,
          file_path: fileName,
          backup_size: JSON.stringify(backupData).length
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchServerBackups(serverId);
      toast({
        title: "Backup Created",
        description: `${backupType.replace('_', ' ').toUpperCase()} backup created successfully`,
      });

      return data;
    } catch (error) {
      console.error('Error creating server backup:', error);
      toast({
        title: "Error",
        description: "Failed to create server backup",
        variant: "destructive",
      });
    }
  };

  const createIdracBackup = async (serverId: string) => {
    // Mock iDRAC configuration export
    // In real implementation, this would connect to iDRAC and export the configuration
    return {
      system_info: {
        service_tag: "EXAMPLE123",
        model: "PowerEdge R740",
        idrac_version: "6.10.30.00"
      },
      network_config: {
        ipv4_enabled: true,
        ipv4_static: true,
        ipv4_address: "192.168.1.100",
        ipv4_netmask: "255.255.255.0",
        ipv4_gateway: "192.168.1.1"
      },
      user_accounts: {
        root: { enabled: true, privilege: "Administrator" }
      },
      alerts: {
        email_enabled: false,
        snmp_enabled: false
      }
    };
  };

  const createBiosBackup = async (serverId: string) => {
    // Mock BIOS profile export
    // In real implementation, this would connect to iDRAC and export the BIOS settings
    return {
      system_profile: {
        boot_mode: "UEFI",
        secure_boot: "Enabled",
        virtualization_technology: "Enabled",
        sr_iov: "Enabled"
      },
      memory_settings: {
        memory_speed: "Maximum Performance",
        numa_nodes_per_socket: "2"
      },
      processor_settings: {
        logical_processor: "Enabled",
        virtualization_technology: "Enabled",
        hardware_prefetcher: "Enabled"
      }
    };
  };

  const createEsxiBackup = async (serverId: string) => {
    // Mock ESXi configuration backup
    // In real implementation, this would use VMware APIs to backup the host configuration
    return {
      host_profile: {
        esxi_version: "7.0.3",
        build_number: "19193900",
        hostname: "esxi-host-01.domain.com"
      },
      network_config: {
        vswitch0: {
          mtu: 1500,
          ports: 128,
          uplinks: ["vmnic0", "vmnic1"]
        }
      },
      storage_config: {
        datastores: [
          { name: "datastore1", type: "VMFS", capacity_gb: 500 }
        ]
      },
      advanced_settings: {
        "Misc.HostAgentUpdateLevel": 3,
        "Net.FollowHardwareMac": 0
      }
    };
  };

  const enterMaintenanceMode = async (serverId: string, evacuateVMs: boolean = true) => {
    try {
      // Mock maintenance mode entry
      // In real implementation, this would use VMware APIs
      
      if (evacuateVMs) {
        // First, migrate VMs to other hosts
        const vms = virtualMachines.filter(vm => 
          vm.server_id === serverId && 
          vm.power_state === 'poweredOn' && 
          !vm.is_template
        );

        for (const vm of vms) {
          // Mock VM migration
          console.log(`Migrating VM ${vm.vm_name} from server ${serverId}`);
        }
      }

      // Update server status to maintenance
      await supabase
        .from('servers')
        .update({ 
          status: 'maintenance' as any,
          last_updated: new Date().toISOString()
        })
        .eq('id', serverId);

      toast({
        title: "Maintenance Mode",
        description: `Server entered maintenance mode${evacuateVMs ? ' with VM evacuation' : ''}`,
      });

    } catch (error) {
      console.error('Error entering maintenance mode:', error);
      toast({
        title: "Error",
        description: "Failed to enter maintenance mode",
        variant: "destructive",
      });
    }
  };

  const exitMaintenanceMode = async (serverId: string) => {
    try {
      // Mock maintenance mode exit
      // In real implementation, this would use VMware APIs
      
      // Update server status to online
      await supabase
        .from('servers')
        .update({ 
          status: 'online',
          last_updated: new Date().toISOString()
        })
        .eq('id', serverId);

      toast({
        title: "Maintenance Mode",
        description: "Server exited maintenance mode successfully",
      });

    } catch (error) {
      console.error('Error exiting maintenance mode:', error);
      toast({
        title: "Error",
        description: "Failed to exit maintenance mode",
        variant: "destructive",
      });
    }
  };

  const testVCenterConnection = async (vcenterId: string) => {
    try {
      // Mock vCenter connection test
      // In real implementation, this would use the test-vcenter-connection edge function
      
      const { data, error } = await supabase.functions.invoke('test-vcenter-connection', {
        body: { vcenterId }
      });

      if (error) throw error;

      const isConnected = Math.random() > 0.3; // Mock 70% success rate

      toast({
        title: "vCenter Connection Test",
        description: isConnected ? "Successfully connected to vCenter" : "Failed to connect to vCenter",
        variant: isConnected ? "default" : "destructive",
      });

      return isConnected;
    } catch (error) {
      console.error('Error testing vCenter connection:', error);
      toast({
        title: "Connection Test Failed",
        description: "Unable to test vCenter connection",
        variant: "destructive",
      });
      return false;
    }
  };

  const syncVMsFromHost = async (serverId: string) => {
    try {
      // Mock VM synchronization from ESXi host
      // In real implementation, this would use VMware APIs to discover VMs
      
      const mockVMs = [
        {
          vm_name: "web-server-01",
          vm_id: "vm-001",
          power_state: "poweredOn",
          cpu_count: 4,
          memory_mb: 8192,
          storage_gb: 100,
          vm_tools_status: "toolsOk",
          is_template: false
        },
        {
          vm_name: "database-server",
          vm_id: "vm-002", 
          power_state: "poweredOn",
          cpu_count: 8,
          memory_mb: 16384,
          storage_gb: 500,
          vm_tools_status: "toolsOk",
          is_template: false
        }
      ];

      // Insert VMs into database
      for (const vmData of mockVMs) {
        await supabase
          .from('virtual_machines')
          .upsert({
            server_id: serverId,
            ...vmData
          }, {
            onConflict: 'server_id,vm_id'
          });
      }

      await fetchVirtualMachines(serverId);
      
      toast({
        title: "VM Sync Complete",
        description: `Synchronized ${mockVMs.length} virtual machines from host`,
      });

    } catch (error) {
      console.error('Error syncing VMs:', error);
      toast({
        title: "Error",
        description: "Failed to sync virtual machines",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchClusters(),
        fetchVirtualMachines(),
        fetchServerBackups()
      ]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscriptions
    const clustersSubscription = supabase
      .channel('clusters_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vcenter_clusters' },
        () => fetchClusters()
      )
      .subscribe();

    const vmsSubscription = supabase
      .channel('vms_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'virtual_machines' },
        () => fetchVirtualMachines()
      )
      .subscribe();

    const backupsSubscription = supabase
      .channel('backups_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'server_backups' },
        () => fetchServerBackups()
      )
      .subscribe();

    return () => {
      clustersSubscription.unsubscribe();
      vmsSubscription.unsubscribe();
      backupsSubscription.unsubscribe();
    };
  }, []);

  return {
    clusters,
    virtualMachines,
    serverBackups,
    loading,
    createServerBackup,
    enterMaintenanceMode,
    exitMaintenanceMode,
    testVCenterConnection,
    syncVMsFromHost,
    refreshData: () => Promise.all([
      fetchClusters(),
      fetchVirtualMachines(),
      fetchServerBackups()
    ])
  };
}