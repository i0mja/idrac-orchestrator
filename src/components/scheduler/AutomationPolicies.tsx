import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useVCenterService } from "@/hooks/useVCenterService";
import { 
  Bot, 
  Calendar, 
  Clock, 
  Plus, 
  RefreshCw, 
  Settings,
  Shield,
  Zap,
  Edit2,
  Trash2,
  CheckCircle
} from "lucide-react";

interface AutomationPolicy {
  id: string;
  name: string;
  description: string;
  cluster_name?: string;
  policy_type: 'firmware_check' | 'security_update' | 'quarterly_update' | 'emergency_patch';
  target_components: string[]; // ['bios', 'idrac', 'storage', 'nic']
  start_date: string;
  schedule: {
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'on_demand';
    day_of_week?: number;
    day_of_month?: number;
    time: string;
  };
  update_strategy: {
    type: 'rolling' | 'parallel' | 'sequential';
    batch_size: number;
    wait_between_batches: number; // minutes
    max_concurrent: number;
  };
  safety_checks: {
    min_healthy_hosts: number;
    require_maintenance_mode: boolean;
    verify_vm_migration: boolean;
    rollback_on_failure: boolean;
    max_downtime_minutes: number;
  };
  filters: {
    criticality_levels: string[];
    exclude_hosts: string[];
  };
  is_active: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
}

interface AutomationPoliciesProps {
  servers?: any[];
}

export function AutomationPolicies({ servers = [] }: AutomationPoliciesProps) {
  const [policies, setPolicies] = useState<AutomationPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AutomationPolicy | null>(null);
  const { vcenters, clusters, syncHosts, fullSync } = useVCenterService();
  const [newPolicy, setNewPolicy] = useState<{
    name: string;
    description: string;
    target_type?: 'cluster' | 'server';
    cluster_name: string;
    server_ids?: string[];
    policy_type: 'firmware_check' | 'security_update' | 'quarterly_update' | 'emergency_patch';
    target_components: string[];
    start_date: string;
    schedule: {
      frequency: 'weekly' | 'monthly' | 'quarterly' | 'on_demand';
      day_of_week?: number;
      day_of_month?: number;
      time: string;
    };
    update_strategy: {
      type: 'rolling' | 'parallel' | 'sequential';
      batch_size: number;
      wait_between_batches: number;
      max_concurrent: number;
    };
    safety_checks: {
      min_healthy_hosts: number;
      require_maintenance_mode: boolean;
      verify_vm_migration: boolean;
      rollback_on_failure: boolean;
      max_downtime_minutes: number;
    };
    filters: {
      criticality_levels: string[];
      exclude_hosts: string[];
    };
  }>({
    name: '',
    description: '',
    target_type: 'cluster',
    cluster_name: 'all',
    server_ids: [],
    policy_type: 'firmware_check',
    target_components: ['bios', 'idrac'],
    start_date: new Date().toISOString().split('T')[0],
    schedule: {
      frequency: 'weekly',
      day_of_week: 1,
      day_of_month: undefined,
      time: '02:00'
    },
    update_strategy: {
      type: 'rolling',
      batch_size: 1,
      wait_between_batches: 30,
      max_concurrent: 1
    },
    safety_checks: {
      min_healthy_hosts: 2,
      require_maintenance_mode: true,
      verify_vm_migration: true,
      rollback_on_failure: true,
      max_downtime_minutes: 60
    },
    filters: {
      criticality_levels: ['critical', 'high'],
      exclude_hosts: []
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAutomationPolicies();
  }, []);

  const loadAutomationPolicies = async () => {
    setIsLoading(true);
    try {
      // Load automation policies from database
      const { data: policiesData, error } = await supabase
        .from('auto_orchestration_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database data to policies format
      const transformedPolicies: AutomationPolicy[] = (policiesData || []).map(config => ({
        id: config.id,
        name: `Auto Orchestration - ${config.execution_interval_months} months`,
        description: `Automatic server updates every ${config.execution_interval_months} months during maintenance window`,
        policy_type: 'quarterly_update',
        target_components: ['BIOS', 'iDRAC'],
        start_date: config.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        schedule: {
          frequency: 'monthly',
          time: config.maintenance_window_start?.slice(0, 5) || '02:00'
        },
        update_strategy: {
          type: 'rolling',
          batch_size: 5,
          wait_between_batches: 30,
          max_concurrent: 3
        },
        safety_checks: {
          min_healthy_hosts: 1,
          require_maintenance_mode: true,
          verify_vm_migration: true,
          rollback_on_failure: true,
          max_downtime_minutes: 60
        },
        filters: {
          criticality_levels: ['production', 'staging'],
          exclude_hosts: []
        },
        is_active: config.enabled,
        enabled: config.enabled,
        priority: 'high',
        notification_settings: {
          email_enabled: true,
          sms_enabled: false
        },
        rollback_settings: {
          enabled: true,
          threshold: 10
        },
        triggers: [{
          type: 'time_based',
          schedule: `0 ${config.maintenance_window_start} * * *`,
          conditions: {
            maintenance_window: true,
            cluster_priority: config.cluster_priority_order || ['production', 'staging', 'development']
          }
        }],
        metadata: {
          execution_interval_months: config.execution_interval_months,
          update_interval_minutes: config.update_interval_minutes,
          maintenance_window_start: config.maintenance_window_start,
          maintenance_window_end: config.maintenance_window_end
        },
        created_at: config.created_at,
        updated_at: config.updated_at
      }));
      
      setPolicies(transformedPolicies);
    } catch (error) {
      console.error('Failed to load automation policies:', error);
      toast({
        title: "Error",
        description: "Failed to load automation policies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createPolicy = async () => {
    if (!newPolicy.name || !newPolicy.description) {
      toast({
        title: "Missing Information",
        description: "Name and description are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // In real implementation, this would save to database
      const policy: AutomationPolicy = {
        id: Date.now().toString(),
        ...newPolicy,
        cluster_name: newPolicy.cluster_name === 'all' ? undefined : newPolicy.cluster_name,
        is_active: true,
        created_at: new Date().toISOString()
      };

      setPolicies(prev => [...prev, policy]);
      
      setNewPolicy({
        name: '',
        description: '',
        target_type: 'cluster',
        cluster_name: 'all',
        server_ids: [],
        policy_type: 'firmware_check',
        target_components: ['bios', 'idrac'],
        start_date: new Date().toISOString().split('T')[0],
        schedule: {
          frequency: 'weekly',
          day_of_week: 1,
          day_of_month: undefined,
          time: '02:00'
        },
        update_strategy: {
          type: 'rolling',
          batch_size: 1,
          wait_between_batches: 30,
          max_concurrent: 1
        },
        safety_checks: {
          min_healthy_hosts: 2,
          require_maintenance_mode: true,
          verify_vm_migration: true,
          rollback_on_failure: true,
          max_downtime_minutes: 60
        },
        filters: {
          criticality_levels: ['critical', 'high'],
          exclude_hosts: []
        }
      });

      toast({
        title: "Automation Policy Created",
        description: "Policy has been created and activated",
      });
    } catch (error) {
      console.error('Failed to create policy:', error);
      toast({
        title: "Error",
        description: "Failed to create automation policy",
        variant: "destructive",
      });
    }
  };

  const togglePolicy = async (id: string, active: boolean) => {
    setPolicies(prev => prev.map(p => 
      p.id === id ? { ...p, is_active: active } : p
    ));
    
    toast({
      title: active ? "Policy Activated" : "Policy Deactivated",
      description: `Automation policy has been ${active ? 'activated' : 'deactivated'}`,
    });
  };

  const deletePolicy = async (id: string) => {
    setPolicies(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Policy Deleted",
      description: "Automation policy has been removed",
    });
  };

  const editPolicy = (policy: AutomationPolicy) => {
    setEditingPolicy(policy);
      setNewPolicy({
        name: policy.name,
        description: policy.description,
        target_type: 'cluster',
        cluster_name: policy.cluster_name || 'all',
        server_ids: [],
        policy_type: policy.policy_type,
        target_components: policy.target_components,
        start_date: policy.start_date,
        schedule: policy.schedule,
        update_strategy: policy.update_strategy,
        safety_checks: policy.safety_checks,
        filters: policy.filters
      });
    };

    const updatePolicy = async () => {
      if (!editingPolicy || !newPolicy.name || !newPolicy.description) {
        toast({
          title: "Missing Information",
          description: "Name and description are required",
          variant: "destructive",
        });
        return;
      }

      try {
        const updatedPolicy: AutomationPolicy = {
          ...editingPolicy,
          ...newPolicy,
          cluster_name: newPolicy.cluster_name === 'all' ? undefined : newPolicy.cluster_name,
        };

        setPolicies(prev => prev.map(p => p.id === editingPolicy.id ? updatedPolicy : p));
        setEditingPolicy(null);
        
        setNewPolicy({
          name: '',
          description: '',
          target_type: 'cluster',
          cluster_name: 'all',
          server_ids: [],
          policy_type: 'firmware_check',
          target_components: ['bios', 'idrac'],
          start_date: new Date().toISOString().split('T')[0],
          schedule: {
            frequency: 'weekly',
            day_of_week: 1,
            day_of_month: undefined,
            time: '02:00'
          },
          update_strategy: {
            type: 'rolling',
            batch_size: 1,
            wait_between_batches: 30,
            max_concurrent: 1
          },
          safety_checks: {
            min_healthy_hosts: 2,
            require_maintenance_mode: true,
            verify_vm_migration: true,
            rollback_on_failure: true,
            max_downtime_minutes: 60
          },
          filters: {
            criticality_levels: ['critical', 'high'],
            exclude_hosts: []
          }
      });

      toast({
        title: "Policy Updated",
        description: "Automation policy has been updated successfully",
      });
    } catch (error) {
      console.error('Failed to update policy:', error);
      toast({
        title: "Error",
        description: "Failed to update automation policy",
        variant: "destructive",
      });
    }
  };

  const getPolicyTypeBadge = (type: string) => {
    switch (type) {
      case 'firmware_check': return <Badge variant="outline" className="text-blue-600">Firmware Check</Badge>;
      case 'security_update': return <Badge variant="outline" className="text-red-600">Security Update</Badge>;
      case 'quarterly_update': return <Badge variant="outline" className="text-green-600">Quarterly Update</Badge>;
      case 'emergency_patch': return <Badge variant="outline" className="text-orange-600">Emergency Patch</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getFrequencyText = (schedule: any) => {
    switch (schedule.frequency) {
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[schedule.day_of_week]} at ${schedule.time}`;
      case 'monthly':
        return `Monthly on day ${schedule.day_of_month} at ${schedule.time}`;
      case 'quarterly':
        return `Quarterly on day ${schedule.day_of_month} at ${schedule.time}`;
      default:
        return schedule.frequency;
    }
  };

  const clusterNames = Array.from(new Set([...clusters.map(c => c.name), ...servers.map(s => s.cluster_name)].filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Automation Policies</h3>
          <p className="text-sm text-muted-foreground">
            Configure automated firmware management policies
          </p>
        </div>
        <Dialog open={!!editingPolicy} onOpenChange={(open) => !open && setEditingPolicy(null)}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPolicy ? 'Edit Automation Policy' : 'Create Automation Policy'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Policy Purpose Explanation */}
              <div className="bg-muted/50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-foreground mb-2">🤖 What are Automation Policies?</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Automation policies automatically manage Dell server firmware updates across your infrastructure. They:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li><strong>Check for updates:</strong> Scan Dell repositories for newer firmware versions</li>
                  <li><strong>Schedule installations:</strong> Apply updates during maintenance windows</li>
                  <li><strong>Ensure safety:</strong> Coordinate with ESXi clusters, migrate VMs, prevent outages</li>
                  <li><strong>Target specific components:</strong> BIOS, iDRAC, storage controllers, network cards</li>
                </ul>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-medium">1. Name Your Policy</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="policy-name">Policy Name</Label>
                    <Input
                      id="policy-name"
                      value={newPolicy.name}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Weekly Security Updates"
                    />
                  </div>
                   <div>
                     <Label htmlFor="policy-type">What type of updates?</Label>
                     <Select value={newPolicy.policy_type} onValueChange={(value: any) => setNewPolicy(prev => ({ ...prev, policy_type: value }))}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="firmware_check">🔍 Firmware Check - Scan only, no automatic installation</SelectItem>
                         <SelectItem value="security_update">🔒 Security Update - Install critical security patches automatically</SelectItem>
                         <SelectItem value="quarterly_update">📅 Quarterly Update - Full firmware refresh every 3 months</SelectItem>
                         <SelectItem value="emergency_patch">⚡ Emergency Patch - Immediate critical fixes</SelectItem>
                       </SelectContent>
                     </Select>
                     <p className="text-xs text-muted-foreground mt-1">
                       {newPolicy.policy_type === 'firmware_check' && "Only scans for available updates without installing"}
                       {newPolicy.policy_type === 'security_update' && "Automatically installs critical security firmware"}
                       {newPolicy.policy_type === 'quarterly_update' && "Comprehensive firmware updates every quarter"}
                       {newPolicy.policy_type === 'emergency_patch' && "High-priority patches installed immediately"}
                     </p>
                   </div>
                </div>
                <div>
                  <Label htmlFor="description">Brief description of what this policy does</Label>
                  <Input
                    id="description"
                    value={newPolicy.description}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Automated weekly check for critical security firmware updates"
                  />
                </div>
              </div>

              {/* Target Assignment */}
              <div className="space-y-4">
                <h4 className="font-medium">2. Choose Your Targets</h4>
                <div>
                  <Label htmlFor="target-type">What infrastructure should this policy manage?</Label>
                  <Select 
                    value={newPolicy.target_type || 'cluster'} 
                    onValueChange={(value) => setNewPolicy(prev => ({ 
                      ...prev, 
                      target_type: value as 'cluster' | 'server',
                      cluster_name: value === 'server' ? undefined : prev.cluster_name,
                      server_ids: value === 'cluster' ? [] : prev.server_ids
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cluster">Apply to ESXi Clusters - Includes cluster-aware safety checks and VM migration</SelectItem>
                      <SelectItem value="server">Apply to Individual Servers - Direct server targeting without cluster coordination</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(newPolicy.target_type || 'cluster') === 'cluster' 
                      ? "🔧 Cluster targeting automatically handles ESXi maintenance mode, VM migration, and ensures cluster health during updates"
                      : "⚡ Individual server targeting skips cluster safety checks - use for standalone servers or when you need direct control"
                    }
                  </p>
                </div>
                
                {(!newPolicy.target_type || newPolicy.target_type === 'cluster') && (
                  <div>
                    <Label htmlFor="cluster">ESXi Cluster Selection</Label>
                    <Select value={newPolicy.cluster_name} onValueChange={(value) => setNewPolicy(prev => ({ ...prev, cluster_name: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All ESXi clusters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🌐 All ESXi Clusters - Policy applies to every discovered cluster</SelectItem>
                        {clusterNames.map((cluster) => (
                          <SelectItem key={cluster} value={cluster}>
                            🏢 {cluster} - Target this specific ESXi cluster only
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      ESXi cluster targeting includes DRS coordination, HA verification, and rolling host updates to maintain cluster availability
                    </p>
                  </div>
                )}

                {newPolicy.target_type === 'server' && (
                  <div>
                    <Label htmlFor="servers">Individual Server Selection</Label>
                    <Select 
                      value={newPolicy.server_ids?.[0] || ''} 
                      onValueChange={(value) => setNewPolicy(prev => ({ 
                        ...prev, 
                        server_ids: value ? [value] : [] 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select specific servers..." />
                      </SelectTrigger>
                      <SelectContent>
                        {servers.map((server) => (
                          <SelectItem key={server.id} value={server.id}>
                            🖥️ {server.hostname} ({server.ip_address}) - {server.environment} | {server.operating_system || 'Unknown OS'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Individual targeting bypasses cluster safety checks - ideal for standalone servers, test systems, or when precise control is needed
                    </p>
                  </div>
                )}
              </div>

              {/* Components to Update */}
              <div className="space-y-4">
                <h4 className="font-medium">3. Select Components to Update</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'bios', name: 'BIOS/UEFI', icon: '🔧', desc: 'System firmware' },
                    { id: 'idrac', name: 'iDRAC', icon: '🖥️', desc: 'Remote management' },
                    { id: 'storage', name: 'Storage', icon: '💾', desc: 'RAID/SAS controllers' },
                    { id: 'nic', name: 'Network', icon: '🌐', desc: 'Network adapters' }
                  ].map((component) => (
                    <div key={component.id} className="flex items-center space-x-2 p-2 border rounded">
                      <input
                        type="checkbox"
                        id={component.id}
                        checked={newPolicy.target_components.includes(component.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewPolicy(prev => ({ ...prev, target_components: [...prev.target_components, component.id] }));
                          } else {
                            setNewPolicy(prev => ({ ...prev, target_components: prev.target_components.filter(c => c !== component.id) }));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor={component.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span>{component.icon}</span>
                          <div>
                            <div className="font-medium text-sm">{component.name}</div>
                            <div className="text-xs text-muted-foreground">{component.desc}</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which firmware components this policy should manage. BIOS and iDRAC are recommended for most policies.
                </p>
              </div>

              {/* Schedule */}
              <div className="space-y-4">
                <h4 className="font-medium">4. Set Update Schedule</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select value={newPolicy.schedule.frequency} onValueChange={(value: any) => setNewPolicy(prev => ({ ...prev, schedule: { ...prev.schedule, frequency: value } }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="day">Day</Label>
                    <Select value={newPolicy.schedule.day_of_week?.toString() || newPolicy.schedule.day_of_month?.toString()} onValueChange={(value) => {
                      if (newPolicy.schedule.frequency === 'weekly') {
                        setNewPolicy(prev => ({ ...prev, schedule: { ...prev.schedule, day_of_week: parseInt(value) } }));
                      } else {
                        setNewPolicy(prev => ({ ...prev, schedule: { ...prev.schedule, day_of_month: parseInt(value) } }));
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {newPolicy.schedule.frequency === 'weekly' ? (
                          <>
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                          </>
                        ) : (
                          Array.from({ length: 28 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              Day {i + 1}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newPolicy.schedule.time}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, schedule: { ...prev.schedule, time: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>

              {/* Update Strategy */}
              <div className="space-y-4">
                <h4 className="font-medium">5. Configure Update Strategy</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="strategy-type">Strategy</Label>
                    <Select value={newPolicy.update_strategy.type} onValueChange={(value: any) => setNewPolicy(prev => ({ ...prev, update_strategy: { ...prev.update_strategy, type: value } }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rolling">Rolling</SelectItem>
                        <SelectItem value="parallel">Parallel</SelectItem>
                        <SelectItem value="sequential">Sequential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input
                      id="batch-size"
                      type="number"
                      min="1"
                      value={newPolicy.update_strategy.batch_size}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, update_strategy: { ...prev.update_strategy, batch_size: parseInt(e.target.value) } }))}
                    />
                  </div>
                </div>
              </div>

              {/* Safety Checks */}
              <div className="space-y-4">
                <h4 className="font-medium">6. Configure Safety Measures</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min-healthy">Min Healthy Hosts</Label>
                    <Input
                      id="min-healthy"
                      type="number"
                      min="1"
                      value={newPolicy.safety_checks.min_healthy_hosts}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, safety_checks: { ...prev.safety_checks, min_healthy_hosts: parseInt(e.target.value) } }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-downtime">Max Downtime (minutes)</Label>
                    <Input
                      id="max-downtime"
                      type="number"
                      min="1"
                      value={newPolicy.safety_checks.max_downtime_minutes}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, safety_checks: { ...prev.safety_checks, max_downtime_minutes: parseInt(e.target.value) } }))}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="maintenance-mode"
                      checked={newPolicy.safety_checks.require_maintenance_mode}
                      onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, safety_checks: { ...prev.safety_checks, require_maintenance_mode: checked } }))}
                    />
                    <Label htmlFor="maintenance-mode">Require maintenance mode</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="vm-migration"
                      checked={newPolicy.safety_checks.verify_vm_migration}
                      onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, safety_checks: { ...prev.safety_checks, verify_vm_migration: checked } }))}
                    />
                    <Label htmlFor="vm-migration">Verify VM migration</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rollback"
                      checked={newPolicy.safety_checks.rollback_on_failure}
                      onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, safety_checks: { ...prev.safety_checks, rollback_on_failure: checked } }))}
                    />
                    <Label htmlFor="rollback">Rollback on failure</Label>
                  </div>
                </div>
              </div>

                <Button onClick={editingPolicy ? updatePolicy : createPolicy} className="w-full">
                  <Bot className="w-4 h-4 mr-2" />
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Policies List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading automation policies...</span>
          </div>
        ) : policies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Automation Policies</h3>
              <p className="text-muted-foreground mb-4">
                Create automation policies to schedule regular firmware checks and updates
              </p>
            </CardContent>
          </Card>
        ) : (
          policies.map((policy) => (
            <Card key={policy.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    {policy.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getPolicyTypeBadge(policy.policy_type)}
                    {policy.is_active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{policy.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Schedule:</span>
                    <p className="font-medium">{getFrequencyText(policy.schedule)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Strategy:</span>
                    <p className="font-medium">{policy.update_strategy.type} (batch: {policy.update_strategy.batch_size})</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target:</span>
                    <p className="font-medium">{policy.cluster_name || 'All clusters'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Run:</span>
                    <p className="font-medium">
                      {policy.next_run ? new Date(policy.next_run).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                {/* Safety Features */}
                <div className="flex flex-wrap gap-2">
                  {policy.safety_checks.require_maintenance_mode && (
                    <Badge variant="outline" className="text-blue-600">
                      <Shield className="w-3 h-3 mr-1" />
                      Maintenance Mode
                    </Badge>
                  )}
                  {policy.safety_checks.verify_vm_migration && (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      VM Migration
                    </Badge>
                  )}
                  {policy.safety_checks.rollback_on_failure && (
                    <Badge variant="outline" className="text-orange-600">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Auto Rollback
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={policy.is_active}
                      onCheckedChange={(checked) => togglePolicy(policy.id, checked)}
                    />
                    <Label className="text-sm">Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => editPolicy(policy)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deletePolicy(policy.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}