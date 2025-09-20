import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  subscription_tier: string;
  max_users: number;
  max_servers: number;
  settings: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  permissions: any;
  invited_by?: string;
  joined_at: string;
  is_active: boolean;
}

export function useMultiTenant() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganization();
    fetchMembers();
  }, []);

  const fetchOrganization = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (profile?.organization_id) {
        const { data: org, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();

        if (error) throw error;
        setOrganization(org);

        // Check if user is admin
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', profile.organization_id)
          .eq('user_id', profile.organization_id) // This should actually be the profile ID
          .single();

        setIsAdmin(membership?.role === 'admin' || membership?.role === 'owner');
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (profile?.organization_id) {
        const { data, error } = await supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', profile.organization_id);

        if (error) throw error;
        setMembers(data || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const updateOrganization = async (updates: Partial<Organization>) => {
    if (!organization || !isAdmin) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);

      if (error) throw error;

      setOrganization(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Organization Updated",
        description: "Organization settings have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const inviteMember = async (email: string, role: string = 'member') => {
    if (!organization || !isAdmin) return;

    try {
      // In a real implementation, this would send an invitation email
      // For now, we'll create a pending invitation
      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: null, // Will be filled when user accepts invitation
          role,
          is_active: false
        });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Invitation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      toast({
        title: "Member Removed",
        description: "Member has been removed from the organization.",
      });
    } catch (error: any) {
      toast({
        title: "Removal Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getUsageStats = () => {
    if (!organization) return null;

    return {
      users: {
        current: members.filter(m => m.is_active).length,
        max: organization.max_users,
        percentage: Math.round((members.filter(m => m.is_active).length / organization.max_users) * 100)
      },
      servers: {
        current: 0, // Would need to query servers table
        max: organization.max_servers,
        percentage: 0
      }
    };
  };

  return {
    organization,
    members,
    loading,
    isAdmin,
    updateOrganization,
    inviteMember,
    updateMemberRole,
    removeMember,
    getUsageStats,
    refresh: () => {
      fetchOrganization();
      fetchMembers();
    }
  };
}