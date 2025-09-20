import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OmeConnection {
  id: string;
  name: string;
  hostname: string;
  port: number;
  use_ssl: boolean;
  credential_profile_id: string;
  status: string;
  last_health_check?: string;
  health_check_error?: string;
  connection_metadata: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  credential_profile?: {
    id: string;
    name: string;
    username: string;
    password_encrypted: string;
    port: number;
    protocol: string;
  };
  baseUrl?: string; // Computed property for compatibility
}

export interface CreateOmeConnectionData {
  name: string;
  hostname: string;
  port: number;
  use_ssl: boolean;
  credential_profile_id: string;
}

export function useOmeConnections() {
  const [connections, setConnections] = useState<OmeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<OmeConnection | null>(null);
  const { toast } = useToast();

  // Fetch connections from database
  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('ome_connections')
        .select(`
          *,
          credential_profile:credential_profiles(
            id,
            name,
            username,
            password_encrypted,
            port,
            protocol
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Transform data to add computed properties
      const transformedData = (data || []).map(conn => {
        const protocol = conn.use_ssl ? 'https' : 'http';
        return {
          ...conn,
          baseUrl: `${protocol}://${conn.hostname}:${conn.port}`
        };
      });
      
      setConnections(transformedData);
      
      // Auto-select first connection if none selected
      if (!selectedConnection && transformedData && transformedData.length > 0) {
        setSelectedConnection(transformedData[0]);
      }
    } catch (error: any) {
      console.error('Error fetching OME connections:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch OME connections',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new connection
  const createConnection = async (connectionData: CreateOmeConnectionData) => {
    try {
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from('ome_connections')
        .insert({
          ...connectionData,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'OME connection created successfully',
      });

      await fetchConnections();
      return data;
    } catch (error: any) {
      console.error('Error creating OME connection:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create OME connection',
      });
      throw error;
    }
  };

  // Update connection
  const updateConnection = async (id: string, updates: Partial<OmeConnection>) => {
    try {
      const { data, error } = await supabase
        .from('ome_connections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'OME connection updated successfully',
      });

      await fetchConnections();
      return data;
    } catch (error: any) {
      console.error('Error updating OME connection:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update OME connection',
      });
      throw error;
    }
  };

  // Delete connection
  const deleteConnection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ome_connections')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'OME connection deleted successfully',
      });

      await fetchConnections();
      
      // Clear selection if deleted connection was selected
      if (selectedConnection?.id === id) {
        setSelectedConnection(null);
      }
    } catch (error: any) {
      console.error('Error deleting OME connection:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete OME connection',
      });
      throw error;
    }
  };

  // Test connection health
  const testConnection = async (id: string) => {
    try {
      await updateConnection(id, { status: 'testing' });
      
      // Call edge function to test connection
      const { data, error } = await supabase.functions.invoke('test-ome-connection', {
        body: { connection_id: id }
      });

      if (error) throw error;

      const status = data.success ? 'connected' : 'error';
      await updateConnection(id, {
        status,
        last_health_check: new Date().toISOString(),
        health_check_error: data.success ? null : data.error,
      });

      return data.success;
    } catch (error: any) {
      console.error('Error testing OME connection:', error);
      await updateConnection(id, {
        status: 'error',
        last_health_check: new Date().toISOString(),
        health_check_error: error.message,
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchConnections();

    // Set up real-time subscription
    const subscription = supabase
      .channel('ome_connections_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ome_connections'
      }, () => {
        fetchConnections();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    connections,
    loading,
    selectedConnection,
    setSelectedConnection,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    refreshConnections: fetchConnections,
  };
}