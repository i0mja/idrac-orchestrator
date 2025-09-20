# Custom Hooks Documentation

## Overview

Custom hooks encapsulate business logic, state management, and side effects. They provide reusable abstractions for common patterns across the application.

## Core Hooks

### Authentication & Authorization

#### `useAuth.ts`
Manages user authentication state and operations.

```typescript
interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Authentication hook
 * Manages user session and authentication state
 */
export function useAuth(): {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

**Features:**
- Session management
- Role-based permissions
- Automatic token refresh
- Real-time session updates

### Data Management

#### `useServers.ts`
Server inventory management with real-time updates.

```typescript
interface UseServersOptions {
  filters?: ServerFilters;
  realtime?: boolean;
  pagination?: PaginationOptions;
}

/**
 * Server management hook
 * Provides server data with filtering and real-time updates
 */
export function useServers(options: UseServersOptions = {}) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Real-time subscription for server updates
  useEffect(() => {
    if (!options.realtime) return;
    
    const channel = supabase
      .channel('servers')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hosts'
      }, handleServerUpdate)
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [options.realtime]);
  
  return {
    servers,
    loading,
    error,
    refetch: () => fetchServers(),
    updateServer: (id: string, updates: Partial<Server>) => Promise<void>,
    deleteServer: (id: string) => Promise<void>
  };
}
```

#### `useEnhancedServers.ts`
Enhanced server data with health metrics and status.

```typescript
/**
 * Enhanced server data hook
 * Includes health metrics, connectivity status, and aggregated data
 */
export function useEnhancedServers(options: EnhancedServerOptions = {}) {
  const { servers, loading } = useServers(options);
  const { healthData } = useServerHealth(servers.map(s => s.id));
  const { connectivity } = useConnectivityStatus(servers.map(s => s.id));
  
  const enhancedServers = useMemo(() => {
    return servers.map(server => ({
      ...server,
      health: healthData[server.id],
      connectivity: connectivity[server.id],
      lastSeen: calculateLastSeen(server),
      firmwareStatus: analyzeFirmwareStatus(server)
    }));
  }, [servers, healthData, connectivity]);
  
  return {
    servers: enhancedServers,
    loading,
    // Additional enhanced methods
    getServersByHealth: (status: HealthStatus) => Server[],
    getOutdatedServers: () => Server[],
    getMaintenanceDue: () => Server[]
  };
}
```

### Update Management

#### `useUpdateJobs.ts`
Update job monitoring and management.

```typescript
interface UpdateJob {
  id: string;
  planId: string;
  hostId: string;
  status: JobStatus;
  progress: number;
  phase: UpdatePhase;
  startTime: Date;
  estimatedCompletion?: Date;
}

/**
 * Update job management hook
 * Monitors and controls firmware update operations
 */
export function useUpdateJobs(planId?: string) {
  const [jobs, setJobs] = useState<UpdateJob[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time job status updates
  useEffect(() => {
    const channel = supabase
      .channel('update-jobs')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'host_runs',
        filter: planId ? `plan_id=eq.${planId}` : undefined
      }, (payload) => {
        updateJobStatus(payload.new);
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [planId]);
  
  return {
    jobs,
    loading,
    // Job control methods
    pauseJob: (jobId: string) => Promise<void>,
    resumeJob: (jobId: string) => Promise<void>,
    cancelJob: (jobId: string) => Promise<void>,
    retryJob: (jobId: string) => Promise<void>,
    // Status queries
    getJobsByStatus: (status: JobStatus) => UpdateJob[],
    getActiveJobs: () => UpdateJob[],
    getFailedJobs: () => UpdateJob[]
  };
}
```

#### `useMaintenanceOrchestrator.ts`
Orchestrates maintenance windows and update scheduling.

```typescript
/**
 * Maintenance orchestrator hook
 * Manages maintenance windows and coordinates updates
 */
export function useMaintenanceOrchestrator() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [activeWindow, setActiveWindow] = useState<MaintenanceWindow | null>(null);
  
  // Check for active maintenance windows
  useEffect(() => {
    const checkActiveWindows = () => {
      const now = new Date();
      const active = windows.find(window => 
        now >= window.startTime && now <= window.endTime
      );
      setActiveWindow(active || null);
    };
    
    const interval = setInterval(checkActiveWindows, 60000); // Check every minute
    checkActiveWindows(); // Initial check
    
    return () => clearInterval(interval);
  }, [windows]);
  
  return {
    windows,
    activeWindow,
    isMaintenanceWindowActive: () => boolean,
    getUpcomingWindows: () => MaintenanceWindow[],
    scheduleUpdate: (planId: string, windowId: string) => Promise<void>,
    requestEmergencyOverride: (reason: string) => Promise<boolean>
  };
}
```

### VMware Integration

#### `useVCenterService.ts`
vCenter integration and cluster management.

```typescript
/**
 * vCenter service hook
 * Manages vCenter connections and cluster operations
 */
export function useVCenterService() {
  const [connections, setConnections] = useState<VCenterConnection[]>([]);
  const [clusters, setClusters] = useState<VCenterCluster[]>([]);
  
  return {
    connections,
    clusters,
    // Connection management
    testConnection: (connectionId: string) => Promise<boolean>,
    syncClusters: (connectionId: string) => Promise<void>,
    // Host operations
    enterMaintenanceMode: (hostId: string) => Promise<void>,
    exitMaintenanceMode: (hostId: string) => Promise<void>,
    // Cluster health
    getClusterHealth: (clusterId: string) => Promise<ClusterHealth>,
    validateUpdateCapacity: (clusterId: string, hostCount: number) => Promise<boolean>
  };
}
```

#### `useVCenterClusterHealth.ts`
Real-time cluster health monitoring.

```typescript
/**
 * vCenter cluster health hook
 * Monitors cluster health and capacity for safe updates
 */
export function useVCenterClusterHealth(clusterId: string) {
  const [health, setHealth] = useState<ClusterHealth | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Periodic health checks
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthData = await supabase.functions.invoke('vsphere-cluster-health', {
          body: { clusterId }
        });
        setHealth(healthData.data);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [clusterId]);
  
  return {
    health,
    loading,
    canUpdateHosts: (hostCount: number) => boolean,
    getRecommendedOrder: () => string[],
    getResourceUtilization: () => ResourceUtilization
  };
}
```

### System Management

#### `useSystemConfig.ts`
System configuration management.

```typescript
/**
 * System configuration hook
 * Manages application-wide settings and preferences
 */
export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  
  const updateConfig = async (key: string, value: any) => {
    const { error } = await supabase
      .from('system_config')
      .upsert({ key, value, updated_at: new Date().toISOString() });
      
    if (!error) {
      setConfig(prev => prev ? { ...prev, [key]: value } : { [key]: value });
    }
  };
  
  return {
    config,
    loading,
    updateConfig,
    // Convenience methods
    getMaintenanceWindows: () => MaintenanceWindow[],
    getNotificationSettings: () => NotificationSettings,
    getIntegrationSettings: () => IntegrationSettings
  };
}
```

#### `useSetupStatus.ts`
Initial setup status and completion tracking.

```typescript
/**
 * Setup status hook
 * Tracks initial application setup completion
 */
export function useSetupStatus() {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const completeSetup = async (config: SetupConfig) => {
    // Save setup configuration
    await supabase.functions.invoke('save-initial-setup', {
      body: { config }
    });
    
    setIsSetupComplete(true);
  };
  
  return {
    isSetupComplete,
    loading,
    completeSetup
  };
}
```

### Background Jobs

#### `useBackgroundJobs.ts`
Background job monitoring and management.

```typescript
/**
 * Background jobs hook
 * Monitors and manages background job processing
 */
export function useBackgroundJobs() {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  
  // Real-time job updates
  useEffect(() => {
    const channel = supabase
      .channel('background-jobs')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'background_jobs'
      }, (payload) => {
        updateJobList(payload);
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, []);
  
  return {
    jobs,
    stats,
    // Job management
    getJobsByType: (type: string) => BackgroundJob[],
    getJobsByStatus: (status: JobStatus) => BackgroundJob[],
    retryFailedJobs: () => Promise<void>,
    clearCompletedJobs: () => Promise<void>
  };
}
```

### Health Monitoring

#### `useHostReadinessCheck.ts`
Server readiness validation for updates.

```typescript
/**
 * Host readiness check hook
 * Validates server readiness before firmware updates
 */
export function useHostReadinessCheck() {
  const checkReadiness = async (hostId: string): Promise<ReadinessResult> => {
    const { data, error } = await supabase.functions.invoke('host-readiness-check', {
      body: { hostId }
    });
    
    if (error) throw error;
    return data;
  };
  
  const checkMultipleHosts = async (hostIds: string[]): Promise<Record<string, ReadinessResult>> => {
    const results = await Promise.allSettled(
      hostIds.map(id => checkReadiness(id))
    );
    
    return hostIds.reduce((acc, id, index) => {
      const result = results[index];
      acc[id] = result.status === 'fulfilled' ? result.value : {
        ready: false,
        issues: ['Failed to check readiness']
      };
      return acc;
    }, {} as Record<string, ReadinessResult>);
  };
  
  return {
    checkReadiness,
    checkMultipleHosts
  };
}
```

### Notifications

#### `useNotifications.ts`
Real-time notification management.

```typescript
/**
 * Notifications hook
 * Manages real-time notifications and alerts
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  
  // Subscribe to system events for notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_events',
        filter: 'severity=in.(warning,error,critical)'
      }, (payload) => {
        const notification = createNotificationFromEvent(payload.new);
        setNotifications(prev => [notification, ...prev.slice(0, 99)]); // Keep last 100
        
        // Show toast for high-priority notifications
        if (notification.priority === 'high') {
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type === 'error' ? 'destructive' : 'default'
          });
        }
      })
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  }, [toast]);
  
  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead: (id: string) => void,
    markAllAsRead: () => void,
    clearAll: () => void
  };
}
```

## Utility Hooks

### `use-mobile.tsx`
Responsive design utilities.

```typescript
/**
 * Mobile detection hook
 * Provides responsive breakpoint detection
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return isMobile;
}
```

### Data Fetching Patterns

All hooks follow consistent patterns for data fetching:

```typescript
// Standard data fetching pattern
function useDataHook<T>(params: Parameters) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(params);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [params]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
}
```

### Real-time Subscription Pattern

Hooks requiring real-time updates follow this pattern:

```typescript
// Real-time subscription pattern
function useRealtimeHook<T>(options: RealtimeOptions) {
  const [data, setData] = useState<T[]>([]);
  
  useEffect(() => {
    // Initial data fetch
    fetchInitialData();
    
    // Setup real-time subscription
    const channel = supabase
      .channel(`realtime-${options.table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: options.table,
        filter: options.filter
      }, (payload) => {
        handleRealtimeUpdate(payload);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.table, options.filter]);
  
  return { data, /* other methods */ };
}
```

This comprehensive hook system provides consistent, reusable abstractions for all business logic while maintaining excellent performance and developer experience.