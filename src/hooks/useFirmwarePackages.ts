import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FirmwarePackage {
  id: string;
  name: string;
  version: string;
  firmware_type: 'idrac' | 'bios' | 'storage' | 'network' | 'other';
  component_name?: string;
  file_path?: string;
  file_size?: number;
  checksum?: string;
  release_date?: string;
  applicable_models?: string[];
  description?: string;
  created_at: string;
  updated_at: string;
}

export function useFirmwarePackages() {
  const [packages, setPackages] = useState<FirmwarePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('firmware_packages')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching firmware packages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch firmware packages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadPackage = async (packageData: Omit<FirmwarePackage, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('firmware_packages')
        .insert([packageData])
        .select()
        .single();

      if (error) throw error;
      
      await fetchPackages();
      toast({
        title: "Success",
        description: "Firmware package uploaded successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error uploading package:', error);
      toast({
        title: "Error",
        description: "Failed to upload firmware package",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return {
    packages,
    loading,
    fetchPackages,
    uploadPackage,
  };
}