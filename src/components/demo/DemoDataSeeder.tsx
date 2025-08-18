// Enhanced: Demo data for heterogeneous multi-datacenter environments
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Loader2 } from "lucide-react";

export function DemoDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [hasData, setHasData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingData();
  }, []);

  const checkExistingData = async () => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      setHasData((data?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking data:', error);
    }
  };

  const seedDemoData = async () => {
    setIsSeeding(true);
    
    try {
      // Enhanced: Seed datacenters first
      const datacenters = [
        {
          id: crypto.randomUUID(),
          name: "DC-East-01",
          location: "New York, NY",
          timezone: "America/New_York",
          contact_email: "ops-east@company.com",
          maintenance_window_start: "02:00",
          maintenance_window_end: "06:00",
          is_active: true
        },
        {
          id: crypto.randomUUID(),
          name: "DC-West-01", 
          location: "San Francisco, CA",
          timezone: "America/Los_Angeles",
          contact_email: "ops-west@company.com",
          maintenance_window_start: "03:00",
          maintenance_window_end: "07:00",
          is_active: true
        },
        {
          id: crypto.randomUUID(),
          name: "DC-Europe-01",
          location: "Frankfurt, Germany",
          timezone: "Europe/Berlin",
          contact_email: "ops-eu@company.com", 
          maintenance_window_start: "01:00",
          maintenance_window_end: "05:00",
          is_active: true
        }
      ];

      const { error: dcError } = await supabase
        .from('datacenters')
        .upsert(datacenters);
      
      if (dcError) throw dcError;

      // Enhanced: Mixed OS servers across datacenters
      const servers = [
        // CentOS 7 servers (EOL risk) in DC-East-01
        {
          hostname: "srv-web-01.east.company.com",
          ip_address: "10.1.1.10",
          model: "PowerEdge R640",
          service_tag: "ABC1234",
          status: "online" as const,
          host_type: "standalone",
          operating_system: "CentOS Linux",
          os_version: "7.9",
          os_eol_date: "2024-06-30",
          site_id: datacenters[0].id,
          timezone: "America/New_York",
          ism_installed: true,
          security_risk_level: "high",
          bios_version: "2.15.0",
          idrac_version: "5.10.10.00",
          rack_location: "Rack A-01, U12"
        },
        {
          hostname: "srv-db-01.east.company.com", 
          ip_address: "10.1.1.20",
          model: "PowerEdge R740",
          service_tag: "DEF5678",
          status: "online" as const,
          host_type: "standalone",
          operating_system: "CentOS Linux",
          os_version: "7.9",
          os_eol_date: "2024-06-30",
          site_id: datacenters[0].id,
          timezone: "America/New_York",
          ism_installed: true,
          security_risk_level: "high",
          bios_version: "2.14.2",
          idrac_version: "5.10.10.00",
          rack_location: "Rack B-02, U08"
        },
        // ESXi hosts in DC-West-01
        {
          hostname: "esxi-01.west.company.com",
          ip_address: "10.2.1.10", 
          model: "PowerEdge R750",
          service_tag: "GHI9012",
          status: "online" as const,
          host_type: "vcenter_managed",
          operating_system: "VMware ESXi",
          os_version: "7.0.3",
          os_eol_date: "2027-10-15",
          site_id: datacenters[1].id,
          timezone: "America/Los_Angeles",
          ism_installed: false,
          security_risk_level: "medium",
          bios_version: "2.17.0",
          idrac_version: "6.10.30.00",
          rack_location: "Rack C-01, U24",
          cluster_name: "West-Cluster-01",
          datacenter: "West-DC-vCenter"
        },
        {
          hostname: "esxi-02.west.company.com",
          ip_address: "10.2.1.11",
          model: "PowerEdge R750", 
          service_tag: "JKL3456",
          status: "online" as const,
          host_type: "vcenter_managed",
          operating_system: "VMware ESXi",
          os_version: "7.0.3",
          os_eol_date: "2027-10-15",
          site_id: datacenters[1].id,
          timezone: "America/Los_Angeles",
          ism_installed: false,
          security_risk_level: "medium",
          bios_version: "2.17.0",
          idrac_version: "6.10.30.00",
          rack_location: "Rack C-01, U26",
          cluster_name: "West-Cluster-01",
          datacenter: "West-DC-vCenter"
        },
        // Mixed environment in DC-Europe-01
        {
          hostname: "srv-app-01.eu.company.com",
          ip_address: "10.3.1.10",
          model: "PowerEdge R650",
          service_tag: "MNO7890",
          status: "online" as const, 
          host_type: "standalone",
          operating_system: "Rocky Linux",
          os_version: "9.3",
          os_eol_date: "2032-05-31",
          site_id: datacenters[2].id,
          timezone: "Europe/Berlin",
          ism_installed: true,
          security_risk_level: "low",
          bios_version: "1.18.0",
          idrac_version: "6.10.30.00",
          rack_location: "Rack D-01, U15"
        },
        {
          hostname: "esxi-eu-01.company.com",
          ip_address: "10.3.1.20",
          model: "PowerEdge R750xs",
          service_tag: "PQR1234",
          status: "offline" as const,
          host_type: "vcenter_managed",
          operating_system: "VMware ESXi", 
          os_version: "8.0.1",
          os_eol_date: "2030-04-02",
          site_id: datacenters[2].id,
          timezone: "Europe/Berlin",
          ism_installed: false,
          security_risk_level: "low",
          bios_version: "2.18.1",
          idrac_version: "6.10.80.00",
          rack_location: "Rack D-02, U20",
          cluster_name: "EU-Cluster-01",
          datacenter: "EU-DC-vCenter"
        }
      ];

      const { error: serverError } = await supabase
        .from('servers')
        .insert(servers);
        
      if (serverError) throw serverError;

      // Enhanced: Seed OS compatibility data
      const osCompatibility = [
        {
          operating_system: "CentOS Linux",
          os_version: "7.9",
          eol_date: "2024-06-30",
          support_status: "end_of_life",
          risk_level: "high",
          recommendations: "Migrate to Rocky Linux 9.x or RHEL 9.x for continued support",
          ism_compatible: true
        },
        {
          operating_system: "VMware ESXi",
          os_version: "7.0.3",
          eol_date: "2027-10-15",
          support_status: "supported",
          risk_level: "medium",
          recommendations: "Plan upgrade to ESXi 8.0+ before EOL",
          ism_compatible: false
        },
        {
          operating_system: "VMware ESXi",
          os_version: "8.0.1", 
          eol_date: "2030-04-02",
          support_status: "supported",
          risk_level: "low",
          recommendations: "Current version - maintain regular patching",
          ism_compatible: false
        },
        {
          operating_system: "Rocky Linux",
          os_version: "9.3",
          eol_date: "2032-05-31",
          support_status: "supported",
          risk_level: "low",
          recommendations: "Modern alternative to CentOS - maintain regular updates",
          ism_compatible: true
        }
      ];

      const { error: osError } = await supabase
        .from('os_compatibility')
        .upsert(osCompatibility);
        
      if (osError) throw osError;

      // Enhanced: Trigger EOL check to generate alerts
      await supabase.rpc('check_os_eol_status');

      setHasData(true);
      toast({
        title: "Demo Data Seeded",
        description: "Multi-datacenter environment with mixed OS configurations created successfully",
      });

    } catch (error) {
      console.error('Error seeding demo data:', error);
      toast({
        title: "Error",
        description: "Failed to seed demo data",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  if (hasData) {
    return null; // Don't show seeder if data already exists
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Demo Environment Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Initialize demo data for heterogeneous multi-datacenter testing with mixed OS environments (CentOS 7 EOL, ESXi, Rocky Linux).
        </p>
        <Button 
          onClick={seedDemoData} 
          disabled={isSeeding}
          className="w-full"
        >
          {isSeeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Seed Demo Data
        </Button>
      </CardContent>
    </Card>
  );
}