import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CredentialProfile {
  id: string;
  name: string;
  description?: string;
  username: string;
  password_encrypted: string;
  port: number;
  protocol: 'https' | 'http';
  is_default: boolean;
  priority_order: number;
  created_at: string;
}

interface CredentialAssignment {
  id: string;
  credential_profile_id: string;
  datacenter_id?: string;
  ip_range_cidr?: string;
  ip_range_start?: string;
  ip_range_end?: string;
  priority_order: number;
  is_active: boolean;
  credential_profile?: CredentialProfile;
}

interface HostCredentialOverride {
  id: string;
  server_id?: string;
  ip_address: string;
  credential_profile_id: string;
  credential_profile?: CredentialProfile;
}

export function useCredentialProfiles() {
  const [profiles, setProfiles] = useState<CredentialProfile[]>([]);
  const [assignments, setAssignments] = useState<CredentialAssignment[]>([]);
  const [overrides, setOverrides] = useState<HostCredentialOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch credential profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('credential_profiles')
        .select('*')
        .order('priority_order', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch credential assignments with profile info
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('credential_assignments')
        .select(`
          *,
          credential_profile:credential_profiles(*)
        `)
        .order('priority_order', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      // Fetch host overrides with profile info
      const { data: overridesData, error: overridesError } = await supabase
        .from('host_credential_overrides')
        .select(`
          *,
          credential_profile:credential_profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (overridesError) throw overridesError;

      setProfiles((profilesData || []).map(profile => ({
        ...profile,
        protocol: profile.protocol as 'https' | 'http'
      })));
      setAssignments((assignmentsData || []).map(assignment => ({
        ...assignment,
        ip_range_cidr: assignment.ip_range_cidr as string,
        ip_range_start: assignment.ip_range_start as string,
        ip_range_end: assignment.ip_range_end as string,
        credential_profile: assignment.credential_profile ? {
          ...assignment.credential_profile,
          protocol: assignment.credential_profile.protocol as 'https' | 'http'
        } as CredentialProfile : undefined
      })));
      setOverrides((overridesData || []).map(override => ({
        ...override,
        ip_address: override.ip_address as string,
        credential_profile: override.credential_profile ? {
          ...override.credential_profile,
          protocol: override.credential_profile.protocol as 'https' | 'http'
        } as CredentialProfile : undefined
      })));

    } catch (error) {
      console.error('Error fetching credential data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch credential profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (profileData: Omit<CredentialProfile, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('credential_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "Credential profile created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating credential profile:', error);
      toast({
        title: "Error",
        description: "Failed to create credential profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProfile = async (id: string, updates: Partial<CredentialProfile>) => {
    try {
      const { data, error } = await supabase
        .from('credential_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "Credential profile updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating credential profile:', error);
      toast({
        title: "Error",
        description: "Failed to update credential profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('credential_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "Credential profile deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting credential profile:', error);
      toast({
        title: "Error",
        description: "Failed to delete credential profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createAssignment = async (assignmentData: Omit<CredentialAssignment, 'id' | 'created_at' | 'updated_at' | 'credential_profile'>) => {
    try {
      const { data, error } = await supabase
        .from('credential_assignments')
        .insert([assignmentData])
        .select()
        .single();

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "Credential assignment created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating credential assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create credential assignment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('credential_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "Credential assignment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting credential assignment:', error);
      toast({
        title: "Error", 
        description: "Failed to delete credential assignment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createHostOverride = async (overrideData: Omit<HostCredentialOverride, 'id' | 'created_at' | 'credential_profile'>) => {
    try {
      const { data, error } = await supabase
        .from('host_credential_overrides')
        .insert([overrideData])
        .select()
        .single();

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "Host credential override created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating host override:', error);
      toast({
        title: "Error",
        description: "Failed to create host credential override",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteHostOverride = async (id: string) => {
    try {
      const { error } = await supabase
        .from('host_credential_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "Host credential override deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting host override:', error);
      toast({
        title: "Error",
        description: "Failed to delete host credential override", 
        variant: "destructive",
      });
      throw error;
    }
  };

  const getCredentialsForIP = async (ipAddress: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_credentials_for_ip', { target_ip: ipAddress });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting credentials for IP:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const profilesSubscription = supabase
      .channel('credential_profiles_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'credential_profiles' },
        () => fetchData()
      )
      .subscribe();

    const assignmentsSubscription = supabase
      .channel('credential_assignments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'credential_assignments' },
        () => fetchData()
      )
      .subscribe();

    const overridesSubscription = supabase
      .channel('host_credential_overrides_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'host_credential_overrides' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesSubscription);
      supabase.removeChannel(assignmentsSubscription);
      supabase.removeChannel(overridesSubscription);
    };
  }, []);

  return {
    profiles,
    assignments,
    overrides,
    loading,
    createProfile,
    updateProfile,
    deleteProfile,
    createAssignment,
    deleteAssignment,
    createHostOverride,
    deleteHostOverride,
    getCredentialsForIP,
    refreshData: fetchData
  };
}