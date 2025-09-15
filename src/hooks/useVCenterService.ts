import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_ENABLED } from '@/lib/env';
import {
  listVCenters as apiListVCenters,
  createVCenter as apiCreateVCenter,
  updateVCenter as apiUpdateVCenter,
  deleteVCenter as apiDeleteVCenter,
} from '@/lib/api';
import type { VCenterPayload } from '@/lib/api';

interface VCenterConfig {
  id: string;
  name: string;
  hostname: string;
  username: string;
  port: number;
  ignore_ssl: boolean;
  created_at: string;
  updated_at: string;
}

interface VCenterCluster {
  id: string;
  name: string;
  vcenter_id: string;
  total_hosts: number;
  active_hosts: number;
  ha_enabled: boolean;
  drs_enabled: boolean;
  maintenance_mode_policy: string;
  created_at: string;
  updated_at: string;
}

interface SyncOperation {
  id: string;
  type: 'connection_test' | 'full_sync' | 'host_sync' | 'cluster_sync';
  vcenter_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

interface VCenterServiceState {
  vcenters: VCenterConfig[];
  clusters: VCenterCluster[];
  operations: SyncOperation[];
  isLoading: boolean;
  lastSync: Record<string, string>; // vcenter_id -> timestamp
}

// Centralized vCenter Service Hook
export const useVCenterService = () => {
  const [state, setState] = useState<VCenterServiceState>({
    vcenters: [],
    clusters: [],
    operations: [],
    isLoading: false,
    lastSync: {}
  });
  
  const { toast } = useToast();

  // Cache management
  const [cache, setCache] = useState<Map<string, { data: any; timestamp: number; ttl: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const getCachedData = useCallback((key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }, [cache]);

  const setCachedData = useCallback((key: string, data: any, ttl: number = CACHE_TTL) => {
    setCache(prev => new Map(prev.set(key, { data, timestamp: Date.now(), ttl })));
  }, [CACHE_TTL]);

  // Load initial data
  const loadVCenters = useCallback(async () => {
    const cached = getCachedData('vcenters');
    if (cached) {
      setState(prev => ({ ...prev, vcenters: cached }));
      return cached;
    }

    try {
      if (!SUPABASE_ENABLED) {
        const data = await apiListVCenters();
        setCachedData('vcenters', data);
        setState(prev => ({ ...prev, vcenters: data }));
        return data;
      }

      const { data, error } = await supabase
        .from('vcenters')
        .select('*')
        .order('name');

      if (error) throw error;

      setCachedData('vcenters', data);
      setState(prev => ({ ...prev, vcenters: data }));
      return data;
    } catch (error) {
      console.error('Failed to load vCenters:', error);
      toast({
        title: "Error",
        description: "Failed to load vCenter configurations",
        variant: "destructive",
      });
      return [];
    }
  }, [getCachedData, setCachedData, toast]);

  const loadClusters = useCallback(async (vcenterId?: string) => {
    if (!SUPABASE_ENABLED) {
      setState(prev => ({ ...prev, clusters: [] }));
      return [];
    }

    const cacheKey = `clusters${vcenterId ? `-${vcenterId}` : ''}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      setState(prev => ({ ...prev, clusters: cached }));
      return cached;
    }

    try {
      let query = supabase.from('vcenter_clusters').select('*');
      if (vcenterId) {
        query = query.eq('vcenter_id', vcenterId);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;

      setCachedData(cacheKey, data);
      setState(prev => ({ ...prev, clusters: data }));
      return data;
    } catch (error) {
      console.error('Failed to load clusters:', error);
      toast({
        title: "Error",
        description: "Failed to load cluster information",
        variant: "destructive",
      });
      return [];
    }
  }, [getCachedData, setCachedData, toast]);

  // Operation management
  const createOperation = useCallback((type: SyncOperation['type'], vcenterId: string): SyncOperation => {
    const operation: SyncOperation = {
      id: Date.now().toString(),
      type,
      vcenter_id: vcenterId,
      status: 'pending',
      progress: 0,
      started_at: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      operations: [...prev.operations, operation]
    }));

    return operation;
  }, []);

  const updateOperation = useCallback((operationId: string, updates: Partial<SyncOperation>) => {
    setState(prev => ({
      ...prev,
      operations: prev.operations.map(op => 
        op.id === operationId ? { ...op, ...updates } : op
      )
    }));
  }, []);

  const removeOperation = useCallback((operationId: string) => {
    setState(prev => ({
      ...prev,
      operations: prev.operations.filter(op => op.id !== operationId)
    }));
  }, []);

  // Core vCenter operations
  const testConnection = useCallback(async (vcenterId: string) => {
    if (!SUPABASE_ENABLED) {
      toast({
        title: "API mode",
        description: "Connection testing requires Supabase edge functions.",
      });
      return { success: false, error: 'supabase_disabled' };
    }

    const operation = createOperation('connection_test', vcenterId);

    try {
      updateOperation(operation.id, { status: 'running', progress: 50 });

      const { data, error } = await supabase.functions.invoke('test-vcenter-connection', {
        body: { vcenter_id: vcenterId }
      });

      if (error) throw error;

      updateOperation(operation.id, { 
        status: 'completed', 
        progress: 100, 
        completed_at: new Date().toISOString() 
      });

      toast({
        title: "Connection Test Successful",
        description: "vCenter connection is working properly",
      });

      // Auto-remove after 5 seconds
      setTimeout(() => removeOperation(operation.id), 5000);

      return { success: true, data };
    } catch (error: any) {
      updateOperation(operation.id, {
        status: 'failed',
        progress: 0,
        error_message: error.message,
        completed_at: new Date().toISOString()
      });

      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to connect to vCenter",
        variant: "destructive",
      });

      return { success: false, error: error.message };
    }
  }, [createOperation, updateOperation, removeOperation, toast]);

  const syncHosts = useCallback(async (vcenterId: string, clusterIds?: string[]) => {
    if (!SUPABASE_ENABLED) {
      toast({
        title: "API mode",
        description: "Host synchronization requires Supabase edge functions.",
      });
      return { success: false, error: 'supabase_disabled' };
    }

    const operation = createOperation('host_sync', vcenterId);

    try {
      updateOperation(operation.id, { status: 'running', progress: 10 });

      const { data, error } = await supabase.functions.invoke('sync-vcenter-hosts', {
        body: { 
          vcenter_id: vcenterId,
          cluster_ids: clusterIds 
        }
      });

      if (error) throw error;

      // Simulate progress updates
      updateOperation(operation.id, { progress: 50 });
      
      // Invalidate cache
      setCache(new Map());
      
      // Refresh data
      await Promise.all([
        loadVCenters(),
        loadClusters(vcenterId)
      ]);

      updateOperation(operation.id, { 
        status: 'completed', 
        progress: 100, 
        completed_at: new Date().toISOString() 
      });

      setState(prev => ({
        ...prev,
        lastSync: { ...prev.lastSync, [vcenterId]: new Date().toISOString() }
      }));

      toast({
        title: "Host Sync Completed",
        description: `Synchronized ${data?.synchronized_hosts || 0} hosts from vCenter`,
      });

      // Auto-remove after 5 seconds
      setTimeout(() => removeOperation(operation.id), 5000);

      return { success: true, data };
    } catch (error: any) {
      updateOperation(operation.id, { 
        status: 'failed', 
        progress: 0, 
        error_message: error.message,
        completed_at: new Date().toISOString() 
      });

      toast({
        title: "Host Sync Failed",
        description: error.message || "Failed to synchronize hosts",
        variant: "destructive",
      });

      return { success: false, error: error.message };
    }
  }, [createOperation, updateOperation, removeOperation, loadVCenters, loadClusters, toast]);

  const fullSync = useCallback(async (vcenterId: string) => {
    if (!SUPABASE_ENABLED) {
      toast({
        title: "API mode",
        description: "Full synchronization requires Supabase edge functions.",
      });
      return { success: false, error: 'supabase_disabled' };
    }

    const operation = createOperation('full_sync', vcenterId);

    try {
      updateOperation(operation.id, { status: 'running', progress: 0 });

      // Step 1: Test connection
      updateOperation(operation.id, { progress: 20 });
      const connectionResult = await testConnection(vcenterId);
      if (!connectionResult.success) {
        throw new Error('Connection test failed');
      }

      // Step 2: Sync clusters
      updateOperation(operation.id, { progress: 40 });
      await loadClusters(vcenterId);

      // Step 3: Sync hosts
      updateOperation(operation.id, { progress: 60 });
      const hostResult = await syncHosts(vcenterId);
      if (!hostResult.success) {
        throw new Error('Host sync failed');
      }

      updateOperation(operation.id, { 
        status: 'completed', 
        progress: 100, 
        completed_at: new Date().toISOString() 
      });

      toast({
        title: "Full Sync Completed",
        description: "All vCenter data has been synchronized successfully",
      });

      // Auto-remove after 5 seconds
      setTimeout(() => removeOperation(operation.id), 5000);

      return { success: true };
    } catch (error: any) {
      updateOperation(operation.id, { 
        status: 'failed', 
        progress: 0, 
        error_message: error.message,
        completed_at: new Date().toISOString() 
      });

      toast({
        title: "Full Sync Failed",
        description: error.message || "Failed to complete full synchronization",
        variant: "destructive",
      });

      return { success: false, error: error.message };
    }
  }, [createOperation, updateOperation, removeOperation, testConnection, syncHosts, loadClusters, toast]);

  // Auto-sync based on schedules
  const scheduleAutoSync = useCallback((vcenterId: string, intervalMinutes: number = 60) => {
    if (!SUPABASE_ENABLED) {
      toast({
        title: "API mode",
        description: "Automatic synchronization requires Supabase edge functions.",
      });
      return () => undefined;
    }

    const interval = setInterval(async () => {
      const lastSyncTime = state.lastSync[vcenterId];
      const shouldSync = !lastSyncTime ||
        Date.now() - new Date(lastSyncTime).getTime() > intervalMinutes * 60 * 1000;

      if (shouldSync) {
        await syncHosts(vcenterId);
      }
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.lastSync, syncHosts, toast]);

  const saveVCenter = useCallback(
    async (input: VCenterPayload & { id?: string }) => {
      const payload = {
        name: input.name,
        hostname: input.hostname,
        username: input.username,
        password: input.password,
        port: input.port ?? 443,
        ignore_ssl: input.ignore_ssl ?? true,
      };

      try {
        if (!SUPABASE_ENABLED) {
          if (input.id) {
            await apiUpdateVCenter(input.id, payload);
          } else {
            await apiCreateVCenter(payload);
          }
        } else {
          if (input.id) {
            const { error } = await supabase
              .from('vcenters')
              .update({ ...payload, updated_at: new Date().toISOString() })
              .eq('id', input.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('vcenters')
              .insert({ ...payload, updated_at: new Date().toISOString() });
            if (error) throw error;
          }
        }

        setCache(new Map());
        await loadVCenters();
      } catch (error) {
        console.error('Failed to save vCenter:', error);
        throw error;
      }
    },
    [loadVCenters]
  );

  const deleteVCenter = useCallback(
    async (id: string) => {
      try {
        if (!SUPABASE_ENABLED) {
          await apiDeleteVCenter(id);
        } else {
          const { error } = await supabase
            .from('vcenters')
            .delete()
            .eq('id', id);
          if (error) throw error;
        }

        setCache(new Map());
        await loadVCenters();
      } catch (error) {
        console.error('Failed to delete vCenter:', error);
        throw error;
      }
    },
    [loadVCenters]
  );

  // Real-time subscriptions
  useEffect(() => {
    if (!SUPABASE_ENABLED) {
      return;
    }

    const channel = supabase
      .channel('vcenter-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vcenters'
        },
        () => {
          // Invalidate cache and reload
          setCache(new Map());
          loadVCenters();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vcenter_clusters'
        },
        () => {
          // Invalidate cache and reload
          setCache(new Map());
          loadClusters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadVCenters, loadClusters]);

  // Initialize data on mount
  useEffect(() => {
    Promise.all([
      loadVCenters(),
      loadClusters()
    ]);
  }, [loadVCenters, loadClusters]);

  // Utility functions
  const getVCenterById = useCallback((id: string) => {
    return state.vcenters.find(vc => vc.id === id);
  }, [state.vcenters]);

  const getClustersByVCenter = useCallback((vcenterId: string) => {
    return state.clusters.filter(cluster => cluster.vcenter_id === vcenterId);
  }, [state.clusters]);

  const getActiveOperations = useCallback((vcenterId?: string) => {
    return state.operations.filter(op => 
      op.status === 'running' && (!vcenterId || op.vcenter_id === vcenterId)
    );
  }, [state.operations]);

  const isVCenterBusy = useCallback((vcenterId: string) => {
    return getActiveOperations(vcenterId).length > 0;
  }, [getActiveOperations]);

  return {
    // State
    vcenters: state.vcenters,
    clusters: state.clusters,
    operations: state.operations,
    isLoading: state.isLoading,
    lastSync: state.lastSync,

    // Operations
    testConnection,
    syncHosts,
    fullSync,
    scheduleAutoSync,

    // Data loaders
    loadVCenters,
    loadClusters,
    saveVCenter,
    deleteVCenter,

    // Utilities
    getVCenterById,
    getClustersByVCenter,
    getActiveOperations,
    isVCenterBusy,

    // Cache management
    clearCache: () => setCache(new Map()),
    
    // Manual refresh
    refresh: () => {
      setCache(new Map());
      return Promise.all([loadVCenters(), loadClusters()]);
    }
  };
};