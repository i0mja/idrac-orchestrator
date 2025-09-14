import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useVCenterIntegratedServers } from "@/hooks/useVCenterIntegratedServers";
import { useCredentialProfiles } from "@/hooks/useCredentialProfiles";
import { useUpdateJobs } from "@/hooks/useUpdateJobs";
import { useFirmwarePackages } from "@/hooks/useFirmwarePackages";
import { useServers } from "@/hooks/useServers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import {
  Server,
  Network,
  MapPin,
  Database,
  Shield,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Cpu,
  HardDrive,
  MonitorSpeaker,
  Globe,
  Calendar,
  Scan,
  Download,
  Upload,
  Terminal,
  Settings,
  Eye,
  Key,
  RefreshCw,
  PlayCircle,
  ExternalLink,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Activity,
  Zap,
  FileText,
  BarChart3,
  PieChart,
  History,
  Workflow,
  CloudUpload,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Bookmark,
  Tag,
  Bell,
  Mail,
  Phone,
  Wrench,
  GitCommit,
  Archive,
  Trash2,
  Copy,
  Move,
  ChevronDown,
  ChevronRight,
  Home,
  Building2,
  Thermometer,
  Gauge,
  Wifi,
  HardDriveIcon,
  MemoryStick,
  Layers,
  Router,
  Cable
} from "lucide-react";

interface ServerWithMetrics {
  id: string;
  hostname: string;
  ip_address: string;
  model: string;
  service_tag: string;
  status: string;
  environment: string;
  datacenter: string;
  vcenter_id?: string;
  vcenter_name?: string;
  cluster_name?: string;
  host_type: 'standalone' | 'vcenter_managed';
  operating_system?: string;
  os_version?: string;
  os_eol_date?: string;
  ism_installed?: boolean;
  security_risk_level?: string;
  cpu_cores?: number;
  memory_gb?: number;
  storage_gb?: number;
  purchase_date?: string;
  warranty_end_date?: string;
  cost_center?: string;
  criticality?: string;
  last_discovered?: string;
  created_at: string;
  updated_at: string;
}

interface AssetMetrics {
  totalAssets: number;
  onlineAssets: number;
  criticalAssets: number;
  eolRiskAssets: number;
  totalValue: number;
  avgAge: number;
  complianceScore: number;
  performanceIndex: number;
}

interface BulkOperation {
  id: string;
  type: 'update' | 'migrate' | 'patch' | 'backup' | 'delete';
  servers: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export function ComprehensiveGlobalInventory() {
  const { 
    servers: integratedServers, 
    loading: vCenterLoading,
    getServerStats,
    refresh: refreshServers
  } = useVCenterIntegratedServers();
  
  const { profiles: credentialProfiles } = useCredentialProfiles();
  const { jobs: updateJobs } = useUpdateJobs();
  const { packages: firmwarePackages } = useFirmwarePackages();
  const { discoverServers, testConnection } = useServers();
  const { toast } = useToast();

  // State management
  const [servers, setServers] = useState<ServerWithMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'topology'>('table');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    environment: "all",
    datacenter: "all",
    status: "all",
    hostType: "all",
    os: "all",
    criticality: "all",
    compliance: "all",
    riskLevel: "all",
    warrantyStatus: "all",
    lastSeen: "all"
  });
  
  // Advanced features
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [assetMetrics, setAssetMetrics] = useState<AssetMetrics>({
    totalAssets: 0,
    onlineAssets: 0,
    criticalAssets: 0,
    eolRiskAssets: 0,
    totalValue: 0,
    avgAge: 0,
    complianceScore: 0,
    performanceIndex: 0
  });
  
  // Dialogs and modals
  const [isDiscoveryDialogOpen, setIsDiscoveryDialogOpen] = useState(false);
  const [isBulkOperationOpen, setBulkOperationOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isAssetDetailOpen, setIsAssetDetailOpen] = useState(false);
  const [isComplianceDialogOpen, setIsComplianceDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerWithMetrics | null>(null);
  
  // Bulk operations
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([]);
  const [selectedBulkOperation, setSelectedBulkOperation] = useState<string>('');
  
  // Real-time data loading
  useEffect(() => {
    loadComprehensiveData();
    
    const interval = setInterval(() => {
      refreshRealTimeData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadComprehensiveData = async () => {
    setLoading(true);
    try {
      // Load servers with enhanced metrics
      const serversWithMetrics = await Promise.all(
        integratedServers.map(async (server) => {
          const metrics = await loadServerMetrics(server.id);
          return { ...server, ...metrics } as ServerWithMetrics;
        })
      );
      
      setServers(serversWithMetrics);
      
      // Calculate asset metrics
      const metrics = calculateAssetMetrics(serversWithMetrics);
      setAssetMetrics(metrics);
      
      // Load saved configurations
      await loadSavedFilters();
      await loadCustomFields();
      await loadBulkOperations();
      
    } catch (error) {
      console.error('Error loading comprehensive data:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadServerMetrics = async (serverId: string) => {
    try {
      // Load comprehensive server metrics from various sources
      const [
        { data: metrics },
        { data: compliance },
        { data: performance },
        { data: vulnerabilities },
        { data: backups }
      ] = await Promise.all([
        supabase.from('system_events')
          .select('*')
          .eq('event_type', 'metrics')
          .contains('metadata', { server_id: serverId })
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('system_events')
          .select('*')
          .eq('event_type', 'compliance_check')
          .contains('metadata', { server_id: serverId })
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('system_events')
          .select('*')
          .eq('event_type', 'performance_metrics')
          .contains('metadata', { server_id: serverId })
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('system_events')
          .select('*')
          .eq('event_type', 'vulnerability_scan')
          .contains('metadata', { server_id: serverId })
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('server_backups')
          .select('*')
          .eq('server_id', serverId)
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      return {
        lastMetricsUpdate: metrics?.[0]?.created_at,
        complianceScore: compliance?.[0]?.metadata ? (compliance[0].metadata as any).score || 0 : 0,
        performanceScore: performance?.[0]?.metadata ? (performance[0].metadata as any).score || 0 : 0,
        vulnerabilityCount: vulnerabilities?.[0]?.metadata ? (vulnerabilities[0].metadata as any).count || 0 : 0,
        lastBackup: backups?.[0]?.created_at,
        backupSize: backups?.[0]?.backup_size || 0
      };
    } catch (error) {
      console.error('Error loading server metrics:', error);
      return {};
    }
  };

  const calculateAssetMetrics = (serverList: ServerWithMetrics[]): AssetMetrics => {
    const total = serverList.length;
    const online = serverList.filter(s => s.status === 'online').length;
    const critical = serverList.filter(s => s.criticality === 'high').length;
    const eolRisk = serverList.filter(s => {
      if (!s.os_eol_date) return false;
      return new Date(s.os_eol_date) <= new Date();
    }).length;

    // Calculate total asset value (mock calculation)
    const totalValue = serverList.reduce((sum, server) => {
      const age = server.purchase_date ? 
        differenceInDays(new Date(), new Date(server.purchase_date)) / 365 : 0;
      const estimatedValue = Math.max(5000 - (age * 1000), 500); // Depreciation model
      return sum + estimatedValue;
    }, 0);

    const avgAge = serverList.reduce((sum, server) => {
      const age = server.purchase_date ? 
        differenceInDays(new Date(), new Date(server.purchase_date)) / 365 : 0;
      return sum + age;
    }, 0) / total || 0;

    return {
      totalAssets: total,
      onlineAssets: online,
      criticalAssets: critical,
      eolRiskAssets: eolRisk,
      totalValue,
      avgAge,
      complianceScore: Math.round((online / total) * 100) || 0,
      performanceIndex: Math.round(((online * 0.6) + ((total - eolRisk) * 0.4)) / total * 100) || 0
    };
  };

  const refreshRealTimeData = useCallback(async () => {
    // Refresh only critical real-time data
    try {
      await refreshServers();
      
      // Update asset metrics
      const updatedMetrics = calculateAssetMetrics(servers);
      setAssetMetrics(updatedMetrics);
      
    } catch (error) {
      console.error('Error refreshing real-time data:', error);
    }
  }, [servers, refreshServers]);

  const loadSavedFilters = async () => {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'inventory_saved_filters');
      
      if (data && data.length > 0) {
        setSavedFilters(Array.isArray(data[0].value) ? data[0].value : []);
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const loadCustomFields = async () => {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'inventory_custom_fields');
      
      if (data && data.length > 0) {
        setCustomFields(Array.isArray(data[0].value) ? data[0].value : []);
      }
    } catch (error) {
      console.error('Error loading custom fields:', error);
    }
  };

  const loadBulkOperations = async () => {
    try {
      const { data } = await supabase
        .from('system_events')
        .select('*')
        .eq('event_type', 'bulk_operation')
        .order('created_at', { ascending: false })
        .limit(10);
      
      setBulkOperations(data?.map(event => ({
        id: event.id,
        type: (event.metadata as any)?.type || 'update',
        servers: (event.metadata as any)?.servers || [],
        status: (event.metadata as any)?.status || 'pending',
        progress: (event.metadata as any)?.progress || 0,
        startTime: event.created_at,
        endTime: (event.metadata as any)?.endTime,
        error: (event.metadata as any)?.error
      })) || []);
    } catch (error) {
      console.error('Error loading bulk operations:', error);
    }
  };

  // Advanced filtering logic
  const filteredServers = useMemo(() => {
    return servers.filter(server => {
      // Text search
      const searchMatch = searchQuery === "" || 
        server.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.ip_address.includes(searchQuery) ||
        server.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.service_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.datacenter?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.operating_system?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter matches
      const environmentMatch = filters.environment === "all" || server.environment === filters.environment;
      const datacenterMatch = filters.datacenter === "all" || server.datacenter === filters.datacenter;
      const statusMatch = filters.status === "all" || server.status === filters.status;
      const hostTypeMatch = filters.hostType === "all" || server.host_type === filters.hostType;
      const osMatch = filters.os === "all" || server.operating_system === filters.os;
      const criticalityMatch = filters.criticality === "all" || server.criticality === filters.criticality;
      
      // Warranty status filter
      let warrantyMatch = true;
      if (filters.warrantyStatus !== "all") {
        const warrantyStatus = getWarrantyStatus(server.warranty_end_date);
        warrantyMatch = warrantyStatus.toLowerCase() === filters.warrantyStatus;
      }

      // Last seen filter
      let lastSeenMatch = true;
      if (filters.lastSeen !== "all") {
        const daysSinceLastSeen = server.last_discovered ? 
          differenceInDays(new Date(), new Date(server.last_discovered)) : 999;
        
        switch (filters.lastSeen) {
          case "today":
            lastSeenMatch = daysSinceLastSeen === 0;
            break;
          case "week":
            lastSeenMatch = daysSinceLastSeen <= 7;
            break;
          case "month":
            lastSeenMatch = daysSinceLastSeen <= 30;
            break;
          case "old":
            lastSeenMatch = daysSinceLastSeen > 30;
            break;
        }
      }

      return searchMatch && environmentMatch && datacenterMatch && statusMatch && 
             hostTypeMatch && osMatch && criticalityMatch && warrantyMatch && lastSeenMatch;
    });
  }, [servers, searchQuery, filters]);

  // Asset lifecycle and compliance functions
  const getWarrantyStatus = (warrantyEndDate?: string) => {
    if (!warrantyEndDate) return "unknown";
    
    const endDate = new Date(warrantyEndDate);
    const now = new Date();
    const daysUntilExpiry = differenceInDays(endDate, now);
    
    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry < 90) return "expiring";
    return "active";
  };

  const getComplianceStatus = (server: ServerWithMetrics) => {
    let score = 100;
    
    // OS EOL check
    if (server.os_eol_date && new Date(server.os_eol_date) <= new Date()) {
      score -= 30;
    }
    
    // Security risk level
    if (server.security_risk_level === 'high') score -= 25;
    else if (server.security_risk_level === 'medium') score -= 10;
    
    // ISM installation
    if (!server.ism_installed) score -= 15;
    
    // Warranty status
    const warrantyStatus = getWarrantyStatus(server.warranty_end_date);
    if (warrantyStatus === 'expired') score -= 20;
    else if (warrantyStatus === 'expiring') score -= 10;
    
    return Math.max(score, 0);
  };

  const getPerformanceIndex = (server: ServerWithMetrics) => {
    // Mock performance calculation based on various factors
    let index = 85; // Base performance
    
    if (server.status !== 'online') index -= 30;
    if (server.cpu_cores && server.cpu_cores < 4) index -= 10;
    if (server.memory_gb && server.memory_gb < 8) index -= 10;
    
    const age = server.purchase_date ? 
      differenceInDays(new Date(), new Date(server.purchase_date)) / 365 : 0;
    if (age > 5) index -= 15;
    else if (age > 3) index -= 5;
    
    return Math.max(index, 0);
  };

  // Bulk operation handlers
  const handleBulkOperation = async (operationType: string) => {
    if (selectedServers.length === 0) {
      toast({
        title: "No Servers Selected",
        description: "Please select servers for the bulk operation",
        variant: "destructive",
      });
      return;
    }

    const operationId = `bulk_${Date.now()}`;
    
    try {
      // Create bulk operation record
      await supabase
        .from('system_events')
        .insert([{
          event_type: 'bulk_operation',
          title: `Bulk ${operationType}`,
          description: `Performing ${operationType} on ${selectedServers.length} servers`,
          severity: 'info',
          metadata: {
            type: operationType,
            servers: selectedServers,
            status: 'pending',
            progress: 0
          }
        }]);

      // Simulate bulk operation progress
      const newOperation: BulkOperation = {
        id: operationId,
        type: operationType as any,
        servers: selectedServers,
        status: 'running',
        progress: 0,
        startTime: new Date().toISOString()
      };
      
      setBulkOperations(prev => [newOperation, ...prev]);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setBulkOperations(prev => prev.map(op => 
          op.id === operationId 
            ? { ...op, progress: Math.min(op.progress + 10, 100) }
            : op
        ));
      }, 1000);

      setTimeout(() => {
        clearInterval(progressInterval);
        setBulkOperations(prev => prev.map(op => 
          op.id === operationId 
            ? { ...op, status: 'completed', progress: 100, endTime: new Date().toISOString() }
            : op
        ));
        
        toast({
          title: "Bulk Operation Complete",
          description: `${operationType} completed successfully on ${selectedServers.length} servers`,
        });
        
        setSelectedServers([]);
        setBulkOperationOpen(false);
      }, 10000);

    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast({
        title: "Bulk Operation Failed",
        description: "Failed to execute bulk operation",
        variant: "destructive",
      });
    }
  };

  // Network discovery and asset detection
  const handleNetworkDiscovery = async (ipRange: string, credentials: any) => {
    setLoading(true);
    try {
      toast({
        title: "Network Discovery Started",
        description: `Scanning ${ipRange} for assets...`,
      });

      await discoverServers(ipRange, credentials);
      
      setTimeout(() => {
        loadComprehensiveData();
        toast({
          title: "Discovery Complete",
          description: "Network scan completed successfully",
        });
      }, 5000);
      
    } catch (error) {
      console.error('Network discovery failed:', error);
      toast({
        title: "Discovery Failed",
        description: "Failed to complete network discovery",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsDiscoveryDialogOpen(false);
    }
  };

  // Export functionality
  const handleExport = async (format: 'csv' | 'excel' | 'json' | 'pdf') => {
    try {
      const exportData = filteredServers.map(server => ({
        hostname: server.hostname,
        ip_address: server.ip_address,
        model: server.model,
        service_tag: server.service_tag,
        status: server.status,
        environment: server.environment,
        datacenter: server.datacenter,
        operating_system: server.operating_system,
        os_version: server.os_version,
        warranty_status: getWarrantyStatus(server.warranty_end_date),
        compliance_score: getComplianceStatus(server),
        performance_index: getPerformanceIndex(server),
        last_discovered: server.last_discovered
      }));

      if (format === 'json') {
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `inventory_${format}.json`);
        link.click();
      } else if (format === 'csv') {
        const headers = Object.keys(exportData[0] || {});
        const csvContent = [
          headers.join(','),
          ...exportData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
        ].join('\n');
        
        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `inventory_${format}.csv`);
        link.click();
      }

      toast({
        title: "Export Complete",
        description: `Inventory exported as ${format.toUpperCase()}`,
      });
      
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export inventory data",
        variant: "destructive",
      });
    } finally {
      setIsExportDialogOpen(false);
    }
  };

  // Status badge helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online": return <Badge className="status-online">Online</Badge>;
      case "offline": return <Badge className="status-offline">Offline</Badge>;
      case "updating": return <Badge className="status-updating">Updating</Badge>;
      case "maintenance": return <Badge className="status-warning">Maintenance</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCriticalityBadge = (criticality: string = 'medium') => {
    switch (criticality) {
      case "high": return <Badge variant="destructive">Critical</Badge>;
      case "medium": return <Badge className="status-warning">Medium</Badge>;
      case "low": return <Badge className="status-online">Low</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getComplianceBadge = (score: number) => {
    if (score >= 90) return <Badge className="status-online">Excellent</Badge>;
    if (score >= 70) return <Badge className="status-warning">Good</Badge>;
    if (score >= 50) return <Badge className="bg-orange-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getRiskLevelBadge = (level: string = 'medium') => {
    switch (level) {
      case "low": return <Badge className="status-online">Low Risk</Badge>;
      case "medium": return <Badge className="status-warning">Medium Risk</Badge>;
      case "high": return <Badge variant="destructive">High Risk</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading && servers.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Database className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Loading Comprehensive Inventory</h3>
          <p className="text-muted-foreground">Gathering asset data from all sources...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Enhanced Header with Action Bar */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gradient">Global Asset Inventory</h1>
                <p className="text-muted-foreground text-lg">
                  Comprehensive asset lifecycle management and monitoring platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                Last Updated: {format(new Date(), 'MMM dd, HH:mm')}
              </Badge>
              <Button variant="outline" size="sm" onClick={refreshRealTimeData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 flex-wrap">
              <Dialog open={isDiscoveryDialogOpen} onOpenChange={setIsDiscoveryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="enterprise">
                    <Scan className="w-4 h-4 mr-2" />
                    Auto Discovery
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Asset Discovery</DialogTitle>
                  </DialogHeader>
                  <NetworkDiscoveryForm onSubmit={handleNetworkDiscovery} />
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkOperationOpen} onOpenChange={setBulkOperationOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={selectedServers.length === 0}>
                    <Workflow className="w-4 h-4 mr-2" />
                    Bulk Actions ({selectedServers.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Operations</DialogTitle>
                  </DialogHeader>
                  <BulkOperationsPanel 
                    selectedServers={selectedServers}
                    onExecute={handleBulkOperation}
                    operations={bulkOperations}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Inventory</DialogTitle>
                  </DialogHeader>
                  <ExportOptionsPanel onExport={handleExport} totalRecords={filteredServers.length} />
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
                {viewMode === 'table' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredServers.length} of {servers.length} assets
              </span>
              {selectedServers.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedServers([])}
                >
                  Clear Selection
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Asset Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <Card className="card-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <h3 className="text-2xl font-bold">{assetMetrics.totalAssets}</h3>
                </div>
                <Server className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <h3 className="text-2xl font-bold text-success">{assetMetrics.onlineAssets}</h3>
                  <Progress value={(assetMetrics.onlineAssets / assetMetrics.totalAssets) * 100} className="mt-2" />
                </div>
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <h3 className="text-2xl font-bold text-destructive">{assetMetrics.criticalAssets}</h3>
                </div>
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">EOL Risk</p>
                  <h3 className="text-2xl font-bold text-warning">{assetMetrics.eolRiskAssets}</h3>
                </div>
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <h3 className="text-xl font-bold">${Math.round(assetMetrics.totalValue / 1000)}K</h3>
                </div>
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Age</p>
                  <h3 className="text-xl font-bold">{assetMetrics.avgAge.toFixed(1)}y</h3>
                </div>
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Compliance</p>
                  <h3 className="text-xl font-bold">{assetMetrics.complianceScore}%</h3>
                  <Progress value={assetMetrics.complianceScore} className="mt-2" />
                </div>
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <h3 className="text-xl font-bold">{assetMetrics.performanceIndex}%</h3>
                  <Progress value={assetMetrics.performanceIndex} className="mt-2" />
                </div>
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Search and Filter Bar */}
        <Card className="card-enterprise">
          <CardContent className="p-4">
            <div className="flex flex-col space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets by hostname, IP, model, service tag, OS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save Filter
                </Button>
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-2">
                <Select value={filters.environment} onValueChange={(value) => setFilters(f => ({...f, environment: value}))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Environments</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.datacenter} onValueChange={(value) => setFilters(f => ({...f, datacenter: value}))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Datacenter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Datacenters</SelectItem>
                    {[...new Set(servers.map(s => s.datacenter).filter(Boolean))].map(dc => (
                      <SelectItem key={dc} value={dc}>{dc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.status} onValueChange={(value) => setFilters(f => ({...f, status: value}))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="updating">Updating</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.hostType} onValueChange={(value) => setFilters(f => ({...f, hostType: value}))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="vcenter_managed">vCenter Managed</SelectItem>
                    <SelectItem value="standalone">Standalone</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.os} onValueChange={(value) => setFilters(f => ({...f, os: value}))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="OS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All OS</SelectItem>
                    {[...new Set(servers.map(s => s.operating_system).filter(Boolean))].map(os => (
                      <SelectItem key={os} value={os}>{os}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.criticality} onValueChange={(value) => setFilters(f => ({...f, criticality: value}))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="high">Critical</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.warrantyStatus} onValueChange={(value) => setFilters(f => ({...f, warrantyStatus: value}))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Warranty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warranty</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring">Expiring</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.lastSeen} onValueChange={(value) => setFilters(f => ({...f, lastSeen: value}))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Last Seen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="old">Older</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setFilters({
                    environment: "all",
                    datacenter: "all", 
                    status: "all",
                    hostType: "all",
                    os: "all",
                    criticality: "all",
                    compliance: "all",
                    riskLevel: "all",
                    warrantyStatus: "all",
                    lastSeen: "all"
                  })}
                  className="h-8"
                >
                  Clear
                </Button>

                <Button variant="outline" size="sm" className="h-8">
                  <FilterIcon className="w-3 h-3 mr-1" />
                  More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewDashboard 
              servers={filteredServers}
              metrics={assetMetrics}
              onServerSelect={setSelectedServer}
            />
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            <AssetsInventoryTable
              servers={filteredServers}
              selectedServers={selectedServers}
              onSelectionChange={setSelectedServers}
              onServerSelect={setSelectedServer}
              viewMode={viewMode}
            />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <ComplianceDashboard 
              servers={filteredServers}
              onServerSelect={setSelectedServer}
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <PerformanceDashboard 
              servers={filteredServers}
              onServerSelect={setSelectedServer}
            />
          </TabsContent>

          <TabsContent value="lifecycle" className="space-y-4">
            <LifecycleDashboard 
              servers={filteredServers}
              onServerSelect={setSelectedServer}
            />
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <OperationsDashboard 
              servers={filteredServers}
              bulkOperations={bulkOperations}
              onServerSelect={setSelectedServer}
            />
          </TabsContent>
        </Tabs>

        {/* Asset Detail Modal */}
        <Dialog open={isAssetDetailOpen} onOpenChange={setIsAssetDetailOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Asset Details: {selectedServer?.hostname}</DialogTitle>
            </DialogHeader>
            {selectedServer && (
              <AssetDetailPanel 
                server={selectedServer}
                onClose={() => setIsAssetDetailOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Supporting Components (placeholder implementations)
const NetworkDiscoveryForm = ({ onSubmit }: { onSubmit: (ipRange: string, credentials: any) => void }) => (
  <div className="space-y-4">
    <div>
      <Label>IP Range</Label>
      <Input placeholder="192.168.1.0/24" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Username</Label>
        <Input placeholder="root" />
      </div>
      <div>
        <Label>Password</Label>
        <Input type="password" />
      </div>
    </div>
    <Button onClick={() => onSubmit('192.168.1.0/24', { username: 'root', password: 'password' })}>
      Start Discovery
    </Button>
  </div>
);

const BulkOperationsPanel = ({ 
  selectedServers, 
  onExecute, 
  operations 
}: { 
  selectedServers: string[]; 
  onExecute: (type: string) => void;
  operations: BulkOperation[];
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <Button onClick={() => onExecute('update')}>Update Firmware</Button>
      <Button onClick={() => onExecute('patch')}>Apply Patches</Button>
      <Button onClick={() => onExecute('backup')}>Create Backup</Button>
      <Button onClick={() => onExecute('migrate')}>Migrate VMs</Button>
    </div>
    <div className="space-y-2">
      <h4 className="font-semibold">Recent Operations</h4>
      {operations.slice(0, 3).map(op => (
        <div key={op.id} className="flex items-center justify-between p-2 bg-muted rounded">
          <span className="text-sm">{op.type} ({op.servers.length} servers)</span>
          <Badge>{op.status}</Badge>
        </div>
      ))}
    </div>
  </div>
);

const ExportOptionsPanel = ({ 
  onExport, 
  totalRecords 
}: { 
  onExport: (format: 'csv' | 'excel' | 'json' | 'pdf') => void;
  totalRecords: number;
}) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Export {totalRecords} records</p>
    <div className="grid grid-cols-2 gap-2">
      <Button onClick={() => onExport('csv')}>CSV</Button>
      <Button onClick={() => onExport('excel')}>Excel</Button>
      <Button onClick={() => onExport('json')}>JSON</Button>
      <Button onClick={() => onExport('pdf')}>PDF Report</Button>
    </div>
  </div>
);

const OverviewDashboard = ({ servers, metrics, onServerSelect }: any) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card className="card-enterprise">
      <CardHeader>
        <CardTitle>Asset Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Production</span>
            <Badge>{servers.filter((s: any) => s.environment === 'production').length}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Development</span>
            <Badge>{servers.filter((s: any) => s.environment === 'development').length}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Staging</span>
            <Badge>{servers.filter((s: any) => s.environment === 'staging').length}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card className="card-enterprise">
      <CardHeader>
        <CardTitle>Health Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Overall Health Score</span>
            <div className="flex items-center gap-2">
              <Progress value={metrics.performanceIndex} className="w-20" />
              <span className="text-sm font-medium">{metrics.performanceIndex}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Compliance Score</span>
            <div className="flex items-center gap-2">
              <Progress value={metrics.complianceScore} className="w-20" />
              <span className="text-sm font-medium">{metrics.complianceScore}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const AssetsInventoryTable = ({ 
  servers, 
  selectedServers, 
  onSelectionChange, 
  onServerSelect,
  viewMode 
}: any) => (
  <Card className="card-enterprise">
    <CardHeader>
      <CardTitle>Asset Inventory ({servers.length})</CardTitle>
    </CardHeader>
    <CardContent>
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedServers.length === servers.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectionChange(servers.map((s: any) => s.id));
                    } else {
                      onSelectionChange([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Warranty</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servers.map((server: ServerWithMetrics) => (
              <TableRow key={server.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedServers.includes(server.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectionChange([...selectedServers, server.id]);
                      } else {
                        onSelectionChange(selectedServers.filter(id => id !== server.id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{server.hostname}</div>
                    <div className="text-sm text-muted-foreground">{server.ip_address}</div>
                    <div className="text-xs text-muted-foreground">{server.model}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {getStatusBadge(server.status)}
                    <div className="text-xs text-muted-foreground">
                      {server.host_type === 'vcenter_managed' ? 'vCenter' : 'Standalone'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getCriticalityBadge(server.criticality)} {server.environment}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {server.datacenter || 'Unknown'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">{server.operating_system || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{server.os_version}</div>
                  </div>
                </TableCell>
                <TableCell>{getComplianceBadge(getComplianceStatus(server))}</TableCell>
                <TableCell>{getWarrantyStatus(server.warranty_end_date)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => onServerSelect(server)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Details</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Manage</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </CardContent>
  </Card>
);

// Additional placeholder components
const ComplianceDashboard = ({ servers, onServerSelect }: any) => (
  <div>Compliance Dashboard - {servers.length} servers</div>
);

const PerformanceDashboard = ({ servers, onServerSelect }: any) => (
  <div>Performance Dashboard - {servers.length} servers</div>
);

const LifecycleDashboard = ({ servers, onServerSelect }: any) => (
  <div>Lifecycle Dashboard - {servers.length} servers</div>
);

const OperationsDashboard = ({ servers, bulkOperations, onServerSelect }: any) => (
  <div>Operations Dashboard - {servers.length} servers, {bulkOperations.length} operations</div>
);

const AssetDetailPanel = ({ server, onClose }: any) => (
  <div>Asset Detail Panel for {server.hostname}</div>
);

// Helper functions
const getComplianceStatus = (server: ServerWithMetrics): number => {
  let score = 100;
  
  if (server.os_eol_date && new Date(server.os_eol_date) <= new Date()) score -= 30;
  if (server.security_risk_level === 'high') score -= 25;
  if (!server.ism_installed) score -= 15;
  
  return Math.max(score, 0);
};

const getWarrantyStatus = (warrantyEndDate?: string): string => {
  if (!warrantyEndDate) return "unknown";
  
  const endDate = new Date(warrantyEndDate);
  const now = new Date();
  const daysUntilExpiry = differenceInDays(endDate, now);
  
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry < 90) return "expiring";
  return "active";
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "online": return <Badge className="status-online">Online</Badge>;
    case "offline": return <Badge className="status-offline">Offline</Badge>;
    case "updating": return <Badge className="status-updating">Updating</Badge>;
    case "maintenance": return <Badge className="status-warning">Maintenance</Badge>;
    default: return <Badge variant="outline">Unknown</Badge>;
  }
};

const getCriticalityBadge = (criticality: string = 'medium') => {
  switch (criticality) {
    case "high": return <Badge variant="destructive">Critical</Badge>;
    case "medium": return <Badge className="status-warning">Medium</Badge>;
    case "low": return <Badge className="status-online">Low</Badge>;
    default: return <Badge variant="outline">Unknown</Badge>;
  }
};

const getComplianceBadge = (score: number) => {
  if (score >= 90) return <Badge className="status-online">Excellent</Badge>;
  if (score >= 70) return <Badge className="status-warning">Good</Badge>;
  if (score >= 50) return <Badge className="bg-orange-500">Fair</Badge>;
  return <Badge variant="destructive">Poor</Badge>;
};