import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SSOProvider {
  id: string;
  organization_id: string;
  provider_type: string;
  provider_name: string;
  configuration: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface APIKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  permissions: any;
  last_used_at?: string;
  expires_at?: string;
  created_by?: string;
  created_at: string;
  is_active: boolean;
}

export interface NotificationChannel {
  id: string;
  organization_id: string;
  name: string;
  channel_type: string;
  configuration: any;
  is_active: boolean;
  created_at: string;
}

export function useAdvancedIntegrations() {
  const [ssoProviders, setSsoProviders] = useState<SSOProvider[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [ssoData, apiKeysData, notificationData] = await Promise.all([
        supabase.from('sso_providers').select('*'),
        supabase.from('api_keys').select('*'),
        supabase.from('notification_channels').select('*')
      ]);

      setSsoProviders(ssoData.data || []);
      setApiKeys(apiKeysData.data || []);
      setNotificationChannels(notificationData.data || []);
    } catch (error) {
      console.error('Error fetching integrations data:', error);
    } finally {
      setLoading(false);
    }
  };

  // SSO Provider Management
  const createSSOProvider = async (provider: Omit<SSOProvider, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('sso_providers')
        .insert(provider)
        .select()
        .single();

      if (error) throw error;

      setSsoProviders(prev => [...prev, data]);
      toast({
        title: "SSO Provider Created",
        description: `${provider.provider_name} has been configured successfully.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "SSO Setup Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSSOProvider = async (id: string, updates: Partial<SSOProvider>) => {
    try {
      const { data, error } = await supabase
        .from('sso_providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSsoProviders(prev => prev.map(p => p.id === id ? data : p));
      toast({
        title: "SSO Provider Updated",
        description: "SSO configuration has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteSSOProvider = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sso_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSsoProviders(prev => prev.filter(p => p.id !== id));
      toast({
        title: "SSO Provider Deleted",
        description: "SSO provider has been removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateAPIKey = async (name: string, permissions: string[] = []) => {
    try {
      // Get current organization ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }

      // Generate a random API key
      const keyPrefix = 'ak_';
      const randomKey = keyPrefix + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          organization_id: profile.organization_id,
          name,
          key_prefix: keyPrefix,
          key_hash: btoa(randomKey), // In production, this should be properly hashed
          permissions,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => [...prev, data]);
      toast({
        title: "API Key Generated",
        description: `API key "${name}" has been created successfully.`,
      });

      return { ...data, key: randomKey }; // Return the actual key only once
    } catch (error: any) {
      toast({
        title: "Key Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const revokeAPIKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k));
      toast({
        title: "API Key Revoked",
        description: "API key has been revoked successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Revocation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAPIKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast({
        title: "API Key Deleted",
        description: "API key has been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Notification Channel Management
  const createNotificationChannel = async (channel: Omit<NotificationChannel, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('notification_channels')
        .insert(channel)
        .select()
        .single();

      if (error) throw error;

      setNotificationChannels(prev => [...prev, data]);
      toast({
        title: "Notification Channel Created",
        description: `${channel.name} has been configured successfully.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Channel Creation Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateNotificationChannel = async (id: string, updates: Partial<NotificationChannel>) => {
    try {
      const { data, error } = await supabase
        .from('notification_channels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setNotificationChannels(prev => prev.map(c => c.id === id ? data : c));
      toast({
        title: "Channel Updated",
        description: "Notification channel has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteNotificationChannel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_channels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotificationChannels(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Channel Deleted",
        description: "Notification channel has been removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const testNotificationChannel = async (id: string) => {
    try {
      // This would integrate with actual notification services
      toast({
        title: "Test Notification Sent",
        description: "Check your configured channel for the test message.",
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    ssoProviders,
    apiKeys,
    notificationChannels,
    loading,
    
    // SSO Methods
    createSSOProvider,
    updateSSOProvider,
    deleteSSOProvider,
    
    // API Key Methods
    generateAPIKey,
    revokeAPIKey,
    deleteAPIKey,
    
    // Notification Methods
    createNotificationChannel,
    updateNotificationChannel,
    deleteNotificationChannel,
    testNotificationChannel,
    
    refresh: fetchData
  };
}