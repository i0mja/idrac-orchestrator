import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IpScope {
  subnet: string;
  vlan?: number;
  description?: string;
}

interface DatacenterScope {
  id: string;
  name: string;
  ip_scopes: IpScope[];
  location?: string;
  is_active: boolean;
}

export function useDatacenterScopes() {
  const [datacenters, setDatacenters] = useState<DatacenterScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDatacenters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('datacenters')
        .select('id, name, ip_scopes, location, is_active')
        .order('name');

      if (error) throw error;
      setDatacenters((data || []).map(dc => ({
        ...dc,
        ip_scopes: (dc.ip_scopes as any) || []
      })));
    } catch (err) {
      console.error('Error fetching datacenter scopes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch datacenter scopes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatacenters();
  }, []);

  const getDatacenterForIP = async (ipAddress: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_datacenter_for_ip', { ip_addr: ipAddress });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error getting datacenter for IP:', err);
      return null;
    }
  };

  const checkIPInScope = async (ipAddress: string, datacenterId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('ip_in_datacenter_scope', { 
          ip_addr: ipAddress, 
          datacenter_id: datacenterId 
        });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error checking IP in scope:', err);
      return false;
    }
  };

  const getActiveDatacenters = () => {
    return datacenters.filter(dc => dc.is_active);
  };

  const getDatacenterById = (id: string) => {
    return datacenters.find(dc => dc.id === id);
  };

  const getAllIPScopes = (): IpScope[] => {
    return datacenters.reduce((scopes, dc) => {
      return [...scopes, ...dc.ip_scopes];
    }, [] as IpScope[]);
  };

  const getDatacentersByScope = (subnet: string) => {
    return datacenters.filter(dc => 
      dc.ip_scopes.some(scope => scope.subnet === subnet)
    );
  };

  return {
    datacenters,
    loading,
    error,
    fetchDatacenters,
    getDatacenterForIP,
    checkIPInScope,
    getActiveDatacenters,
    getDatacenterById,
    getAllIPScopes,
    getDatacentersByScope,
  };
}