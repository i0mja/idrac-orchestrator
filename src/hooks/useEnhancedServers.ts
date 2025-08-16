// Enhanced: OS-agnostic server management with multi-datacenter support
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EnhancedServer {
  id: string;
  hostname: string;
  ip_address: string | unknown;
  model?: string | null;
  service_tag?: string | null;
  status: 'online' | 'offline' | 'unknown' | 'updating' | 'error' | 'maintenance';
  host_type: string;
  vcenter_id?: string | null;
  cluster_name?: string | null;
  datacenter?: string | null;
  environment?: string | null;
  bios_version?: string | null;
  idrac_version?: string | null;
  rack_location?: string | null;
  last_discovered?: string | null;
  last_updated?: string | null;
  created_at: string;
  updated_at: string;
  // Enhanced: Multi-OS and datacenter support
  operating_system?: string | null;
  os_version?: string | null;
  os_eol_date?: string | null;
  site_id?: string | null;
  timezone?: string | null;
  ism_installed?: boolean;
  security_risk_level?: string;
}

export interface Datacenter {
  id: string;
  name: string;
  location?: string | null;
  timezone: string;
  contact_email?: string | null;
  maintenance_window_start: string;
  maintenance_window_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OSCompatibility {
  id: string;
  operating_system: string;
  os_version: string;
  server_model?: string | null;
  eol_date?: string | null;
  support_status: string;
  risk_level: string;
  recommendations?: string | null;
  ism_compatible: boolean;
}

export interface EOLAlert {
  id: string;
  server_id: string;
  alert_type: string;
  severity: string;
  message: string;
  recommendation?: string | null;
  acknowledged: boolean;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
}

export function useEnhancedServers() {
  const [servers, setServers] = useState<EnhancedServer[]>([]);
  const [datacenters, setDatacenters] = useState<Datacenter[]>([]);
  const [osCompatibility, setOSCompatibility] = useState<OSCompatibility[]>([]);
  const [eolAlerts, setEOLAlerts] = useState<EOLAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchServers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('hostname');

      if (error) throw error;
      setServers((data || []).map((server: any) => ({
        ...server,
        host_type: server.host_type || 'standalone',
        timezone: server.timezone || 'UTC',
        ism_installed: server.ism_installed || false,
        security_risk_level: server.security_risk_level || 'medium'
      })));
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch servers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDatacenters = async () => {
    try {
      const { data, error } = await supabase
        .from('datacenters')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDatacenters(data || []);
    } catch (error) {
      console.error('Error fetching datacenters:', error);
    }
  };

  const fetchOSCompatibility = async () => {
    try {
      const { data, error } = await supabase
        .from('os_compatibility')
        .select('*')
        .order('operating_system', { ascending: true });

      if (error) throw error;
      setOSCompatibility(data || []);
    } catch (error) {
      console.error('Error fetching OS compatibility:', error);
    }
  };

  const fetchEOLAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('eol_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEOLAlerts(data || []);
    } catch (error) {
      console.error('Error fetching EOL alerts:', error);
    }
  };

  // Enhanced: OS detection via iDRAC/Redfish API
  const detectServerOS = async (serverId: string) => {
    try {
      const server = servers.find(s => s.id === serverId);
      if (!server) throw new Error('Server not found');

      const { data, error } = await supabase.functions.invoke('redfish-discovery', {
        body: { 
          serverIds: [serverId],
          detectOS: true // Enhanced: OS detection flag
        }
      });

      if (error) throw error;

      await fetchServers();
      toast({
        title: "OS Detection Complete",
        description: `OS detected for ${server.hostname}`,
      });
    } catch (error) {
      console.error('Error detecting OS:', error);
      toast({
        title: "OS Detection Failed",
        description: "Failed to detect operating system",
        variant: "destructive",
      });
    }
  };

  // Enhanced: iSM installation check and deployment
  const checkISMStatus = async (serverId: string) => {
    try {
      const server = servers.find(s => s.id === serverId);
      if (!server) throw new Error('Server not found');

      // Check if iSM is installed via remote command
      const { data, error } = await supabase.functions.invoke('execute-remote-command', {
        body: {
          command: {
            target_type: 'individual',
            target_names: [server.hostname],
            command_type: 'health_check',
            command_parameters: { check_ism: true }
          }
        }
      });

      if (error) throw error;

      return data?.ism_installed || false;
    } catch (error) {
      console.error('Error checking iSM status:', error);
      return false;
    }
  };

  // Enhanced: Multi-datacenter grouping and filtering
  const getServersByDatacenter = (datacenterId?: string) => {
    if (!datacenterId) return servers;
    return servers.filter(s => s.site_id === datacenterId);
  };

  const getServersByOS = (os?: string) => {
    if (!os) return servers;
    return servers.filter(s => s.operating_system === os);
  };

  // Enhanced: EOL risk assessment
  const getEOLRiskServers = () => {
    return servers.filter(s => {
      if (!s.os_eol_date) return false;
      const eolDate = new Date(s.os_eol_date);
      const now = new Date();
      return eolDate <= now;
    });
  };

  const getExpiringServers = (days: number = 90) => {
    return servers.filter(s => {
      if (!s.os_eol_date) return false;
      const eolDate = new Date(s.os_eol_date);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      return eolDate <= futureDate && eolDate > new Date();
    });
  };

  // Enhanced: Acknowledge EOL alerts
  const acknowledgeEOLAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('eol_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: 'current_user' // Replace with actual user ID
        })
        .eq('id', alertId);

      if (error) throw error;
      
      await fetchEOLAlerts();
      toast({
        title: "Alert Acknowledged",
        description: "EOL alert has been acknowledged",
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  // Enhanced: Update server with OS information
  const updateServerOS = async (serverId: string, osData: {
    operating_system: string;
    os_version: string;
    os_eol_date?: string;
    ism_installed?: boolean;
  }) => {
    try {
      const { error } = await supabase
        .from('servers')
        .update({
          ...osData,
          security_risk_level: osData.os_eol_date && new Date(osData.os_eol_date) <= new Date() ? 'high' : 'medium'
        })
        .eq('id', serverId);

      if (error) throw error;
      
      await fetchServers();
      
      // Check for EOL status after update
      await supabase.rpc('check_os_eol_status');
      await fetchEOLAlerts();
      
      toast({
        title: "Server Updated",
        description: "Server OS information updated successfully",
      });
    } catch (error) {
      console.error('Error updating server OS:', error);
      toast({
        title: "Error",
        description: "Failed to update server OS information",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchServers();
    fetchDatacenters();
    fetchOSCompatibility();
    fetchEOLAlerts();

    // Set up real-time subscriptions
    const serverSubscription = supabase
      .channel('enhanced_servers_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'servers' },
        () => {
          fetchServers();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'eol_alerts' },
        () => {
          fetchEOLAlerts();
        }
      )
      .subscribe();

    return () => {
      serverSubscription.unsubscribe();
    };
  }, []);

  return {
    servers,
    datacenters,
    osCompatibility,
    eolAlerts,
    loading,
    fetchServers,
    fetchDatacenters,
    fetchOSCompatibility,
    fetchEOLAlerts,
    detectServerOS,
    checkISMStatus,
    getServersByDatacenter,
    getServersByOS,
    getEOLRiskServers,
    getExpiringServers,
    acknowledgeEOLAlert,
    updateServerOS,
    refresh: () => {
      fetchServers();
      fetchDatacenters();
      fetchOSCompatibility();
      fetchEOLAlerts();
    }
  };
}