import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Centralized cache for shared data
interface DataCache {
  servers: any[];
  dellPackages: any[];
  systemEvents: any[];
  autoConfig: any;
  lastFetch: Record<string, number>;
}

// Singleton pattern for data cache with optimized batching
class OptimizedDataCache {
  private static instance: OptimizedDataCache;
  public cache: DataCache = {
    servers: [],
    dellPackages: [],
    systemEvents: [],
    autoConfig: null,
    lastFetch: {}
  };
  private subscribers: Set<Function> = new Set();
  private channels: any[] = [];
  private pendingFetches: Map<string, Promise<any>> = new Map();

  static getInstance(): OptimizedDataCache {
    if (!OptimizedDataCache.instance) {
      OptimizedDataCache.instance = new OptimizedDataCache();
    }
    return OptimizedDataCache.instance;
  }

  subscribe(callback: Function) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(callback => callback(this.cache));
  }

  // Optimized fetch with deduplication
  async fetchData(type: keyof DataCache, forceRefresh = false): Promise<any[]> {
    const now = Date.now();
    const cacheExpiry = 30000; // 30 seconds

    // Return cached data if fresh and not forced refresh
    if (!forceRefresh && 
        this.cache.lastFetch[type] && 
        now - this.cache.lastFetch[type] < cacheExpiry) {
      return this.cache[type] as any[];
    }

    // Deduplicate concurrent requests
    const pendingKey = `${type}-${forceRefresh}`;
    if (this.pendingFetches.has(pendingKey)) {
      return this.pendingFetches.get(pendingKey);
    }

    const fetchPromise = this.performFetch(type);
    this.pendingFetches.set(pendingKey, fetchPromise);

    try {
      const data = await fetchPromise;
      this.cache[type] = data as any;
      this.cache.lastFetch[type] = now;
      this.notify();
      return data;
    } finally {
      this.pendingFetches.delete(pendingKey);
    }
  }

  private async performFetch(type: keyof DataCache): Promise<any> {
    try {
      switch (type) {
        case 'servers':
          const serversResult = await supabase.from('servers').select('*').order('hostname');
          return serversResult.data || [];
        case 'dellPackages':
          const packagesResult = await supabase.from('dell_update_packages').select('*').order('update_sequence_order');
          return packagesResult.data || [];
        case 'systemEvents':
          const eventsResult = await supabase.from('system_events').select('*').order('created_at', { ascending: false }).limit(100);
          return eventsResult.data || [];
        case 'autoConfig':
          const configResult = await supabase.from('auto_orchestration_config').select('*').single();
          return configResult.data;
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      return this.cache[type] as any[] || [];
    }
  }

  // Batch operations to reduce API calls
  async batchFetch(types: (keyof DataCache)[], forceRefresh = false): Promise<Partial<DataCache>> {
    const promises = types.map(type => this.fetchData(type, forceRefresh));
    const results = await Promise.all(promises);
    
    const batchResult: Partial<DataCache> = {};
    types.forEach((type, index) => {
      batchResult[type] = results[index] as any;
    });
    
    return batchResult;
  }

  // Optimized bulk operations
  async bulkUpdateServers(updates: Array<{ id: string; updates: any }>): Promise<boolean> {
    try {
      const promises = updates.map(({ id, updates: serverUpdates }) =>
        supabase.from('servers').update(serverUpdates).eq('id', id)
      );
      
      const results = await Promise.all(promises);
      const hasErrors = results.some(result => result.error);
      
      if (!hasErrors) {
        this.fetchData('servers', true); // Refresh cache
      }
      
      return !hasErrors;
    } catch (error) {
      console.error('Bulk update error:', error);
      return false;
    }
  }

  // Smart event creation with aggregation
  async createOptimizedEvent(events: Array<{ 
    event_type: string; 
    severity: 'info' | 'warning' | 'error' | 'success'; 
    title: string; 
    description?: string; 
  }>): Promise<any> {
    try {
      if (events.length === 1) {
        // Single event - use normal creation
        const result = await supabase.from('system_events').insert([events[0]]).select().single();
        if (!result.error) {
          this.fetchData('systemEvents', true);
        }
        return result;
      }

      // Multiple events - create aggregated event
      const aggregatedEvent = {
        event_type: 'aggregated_events',
        severity: events.some(e => e.severity === 'error') ? 'error' : 
                 events.some(e => e.severity === 'warning') ? 'warning' : 'info',
        title: `Multiple Events (${events.length})`,
        description: `Aggregated ${events.length} related events`,
        metadata: { events }
      };

      const result = await supabase.from('system_events').insert([aggregatedEvent]).select().single();
      if (!result.error) {
        this.fetchData('systemEvents', true);
      }
      return result;
    } catch (error) {
      console.error('Event creation error:', error);
      return { error };
    }
  }

  // Set up realtime subscriptions once for all components
  setupRealtimeSubscriptions() {
    if (this.channels.length > 0) return; // Already set up

    const tables = [
      { table: 'servers', cacheKey: 'servers' },
      { table: 'dell_update_packages', cacheKey: 'dellPackages' },
      { table: 'system_events', cacheKey: 'systemEvents' },
      { table: 'auto_orchestration_config', cacheKey: 'autoConfig' }
    ];

    tables.forEach(({ table, cacheKey }) => {
      const channel = supabase
        .channel(`optimized-${table}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          () => {
            // Refresh specific cache entry
            this.fetchData(cacheKey as keyof DataCache, true);
          }
        )
        .subscribe();

      this.channels.push(channel);
    });
  }

  cleanup() {
    this.channels.forEach(channel => supabase.removeChannel(channel));
    this.channels = [];
    this.subscribers.clear();
    this.pendingFetches.clear();
  }
}

// Hook for optimized data access
export function useOptimizedDataFlow(requiredData: (keyof DataCache)[] = []) {
  const [data, setData] = useState<Partial<DataCache>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const cache = OptimizedDataCache.getInstance();

  const fetchRequiredData = useCallback(async (forceRefresh = false) => {
    if (requiredData.length === 0) return;

    setLoading(true);
    try {
      const result = await cache.batchFetch(requiredData, forceRefresh);
      setData(result);
    } catch (error) {
      console.error('Error in optimized data flow:', error);
      toast({
        title: "Data Load Error",
        description: "Failed to load required data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [requiredData, cache, toast]);

  useEffect(() => {
    // Set up realtime subscriptions once
    cache.setupRealtimeSubscriptions();
    
    // Subscribe to cache updates
    const unsubscribe = cache.subscribe(setData);

    // Initial data fetch
    fetchRequiredData();

    return () => {
      unsubscribe();
    };
  }, [fetchRequiredData]);

  return {
    ...data,
    loading,
    refresh: (forceRefresh = true) => fetchRequiredData(forceRefresh),
    bulkUpdateServers: cache.bulkUpdateServers.bind(cache),
    createOptimizedEvent: cache.createOptimizedEvent.bind(cache),
    cacheInstance: cache
  };
}