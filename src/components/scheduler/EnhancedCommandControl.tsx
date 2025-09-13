import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedServers } from "@/hooks/useEnhancedServers";
import { CampaignCreationDialog } from "./CampaignCreationDialog";
import { CampaignFilters, type CampaignFilters as CampaignFiltersType } from "./CampaignFilters";
import { CampaignDetailsModal } from "./CampaignDetailsModal";
import { CampaignTemplatesModal } from "./CampaignTemplatesModal";
import { BulkCampaignActions } from "./BulkCampaignActions";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings,
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Shield,
  Activity,
  GitBranch,
  PlayCircle,
  PauseCircle,
  Layers,
  Plus,
  Zap,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Calendar
} from "lucide-react";

interface UpdateCampaign {
  id: string;
  name: string;
  target_datacenters: string[];
  update_type: 'firmware' | 'bios' | 'idrac' | 'security_patch' | 'emergency';
  components: string[];
  rollout_strategy: 'parallel' | 'sequential' | 'canary';
  status: 'draft' | 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'failed';
  progress: number;
  total_servers: number;
  completed_servers: number;
  start_date: string;
  estimated_completion: string;
  created_by: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}


export function EnhancedCommandControl() {
  const [campaigns, setCampaigns] = useState<UpdateCampaign[]>([]);
  const [orchestrationPlans, setOrchestrationPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [filters, setFilters] = useState<CampaignFiltersType>({
    search: '',
    status: 'all',
    priority: 'all',
    datacenter: 'all',
    dateRange: {},
    tags: [],
    createdBy: 'all'
  });
  const { servers, datacenters } = useEnhancedServers();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load actual orchestration plans from database
      const { data: plans, error: plansError } = await supabase
        .from('update_orchestration_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      setOrchestrationPlans(plans || []);

      // Transform orchestration plans to campaigns format
      const transformedCampaigns: UpdateCampaign[] = (plans || []).map(plan => {
        const updateSequence = plan.update_sequence as any;
        
        // Map database status to campaign status
        let campaignStatus: UpdateCampaign['status'];
        switch (plan.status) {
          case 'planned':
            campaignStatus = 'scheduled';
            break;
          case 'in_progress':
            campaignStatus = 'in_progress';
            break;
          case 'paused':
            campaignStatus = 'paused';
            break;
          case 'completed':
            campaignStatus = 'completed';
            break;
          default:
            campaignStatus = 'draft';
        }

        return {
          id: plan.id,
          name: plan.name,
          target_datacenters: [], // Will be filled from server data
          update_type: updateSequence?.update_type || 'firmware',
          components: updateSequence?.components || [],
          rollout_strategy: updateSequence?.rollout_strategy || 'sequential',
          status: campaignStatus,
          progress: Math.floor((plan.current_step / (plan.total_steps || 1)) * 100),
          total_servers: plan.server_ids?.length || 0,
          completed_servers: plan.current_step || 0,
          start_date: plan.started_at || plan.next_execution_date || plan.created_at,
          estimated_completion: plan.completed_at || new Date(Date.now() + 86400000 * 3).toISOString(),
          created_by: plan.created_by || 'system',
          priority: updateSequence?.priority || 'medium'
        };
      });

      setCampaigns(transformedCampaigns);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load update management data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'resume' | 'monitor') => {
    try {
      const campaign = orchestrationPlans.find(p => p.id === campaignId);
      if (!campaign) return;

      switch (action) {
        case 'pause':
          await supabase
            .from('update_orchestration_plans')
            .update({ status: 'paused' })
            .eq('id', campaignId);

          await supabase
            .from('system_events')
            .insert({
              title: `Campaign Paused: ${campaign.name}`,
              description: 'Update campaign has been paused by user',
              event_type: 'campaign_paused',
              severity: 'warning'
            });

          toast({
            title: "Campaign Paused",
            description: `${campaign.name} has been paused`,
          });
          break;

        case 'resume':
          await supabase
            .from('update_orchestration_plans')
            .update({ status: 'in_progress' })
            .eq('id', campaignId);

          // Trigger auto-orchestration
          await supabase.functions.invoke('auto-orchestration', {
            body: { plan_id: campaignId, action: 'resume' }
          });

          await supabase
            .from('system_events')
            .insert({
              title: `Campaign Resumed: ${campaign.name}`,
              description: 'Update campaign has been resumed',
              event_type: 'campaign_resumed',
              severity: 'info'
            });

          toast({
            title: "Campaign Resumed",
            description: `${campaign.name} has been resumed`,
          });
          break;

        case 'monitor':
          // Open monitoring in new tab (would be a detailed view)
          toast({
            title: "Opening Monitor",
            description: `Opening detailed monitoring for ${campaign.name}`,
          });
          break;
      }

      loadData(); // Refresh data
    } catch (error) {
      console.error('Error handling campaign action:', error);
      toast({
        title: "Error",
        description: "Failed to execute campaign action",
        variant: "destructive"
      });
    }
  };

  const handleEmergencyAction = async (actionType: 'security_patch' | 'idrac_update') => {
    try {
      const actionName = actionType === 'security_patch' ? 'Emergency Security Patch' : 'Emergency iDRAC Update';
      
      // Create emergency campaign
      const { data: plan, error } = await supabase
        .from('update_orchestration_plans')
        .insert({
          name: `${actionName} - ${new Date().toISOString().split('T')[0]}`,
          server_ids: [], // Would be populated based on selection
          update_sequence: {
            update_type: actionType,
            components: actionType === 'security_patch' ? ['BIOS', 'iDRAC', 'System CPLD'] : ['iDRAC'],
            rollout_strategy: 'parallel',
            priority: 'critical'
          },
          safety_checks: {
            requires_approval: false,
            max_concurrent_updates: 10,
            emergency_mode: true
          },
          status: 'in_progress',
          total_steps: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Execute emergency action
      await supabase.functions.invoke('execute-remote-command', {
        body: {
          command: {
            name: actionName,
            target_type: 'datacenter',
            target_names: datacenters.map(dc => dc.name),
            command_type: actionType === 'security_patch' ? 'security_patch' : 'idrac_update',
            command_parameters: {
              emergency_mode: true,
              priority: 'critical'
            }
          },
          immediate_execution: true,
          enhanced_mode: true
        }
      });

      await supabase
        .from('system_events')
        .insert({
          title: `Emergency Action Initiated: ${actionName}`,
          description: `Critical ${actionType} deployment started across all datacenters`,
          event_type: 'emergency_action',
          severity: 'critical',
          metadata: {
            plan_id: plan.id,
            action_type: actionType
          }
        });

      toast({
        title: "Emergency Action Initiated",
        description: `${actionName} deployment has started across all datacenters`,
      });

      loadData();
    } catch (error) {
      console.error('Error executing emergency action:', error);
      toast({
        title: "Error",
        description: "Failed to execute emergency action",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, priority?: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      case 'scheduled': return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'in_progress': return <Badge className="bg-purple-500">In Progress</Badge>;
      case 'paused': return <Badge className="bg-yellow-500">Paused</Badge>;
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-red-500">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge className="bg-green-500">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Apply filters to campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    // Search filter
    if (filters.search && !campaign.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (filters.status !== 'all' && campaign.status !== filters.status) {
      return false;
    }
    
    // Priority filter
    if (filters.priority !== 'all' && campaign.priority !== filters.priority) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      const campaignDate = new Date(campaign.start_date);
      if (filters.dateRange.from && campaignDate < filters.dateRange.from) {
        return false;
      }
      if (filters.dateRange.to && campaignDate > filters.dateRange.to) {
        return false;
      }
    }
    
    return true;
  });

  const activeCampaigns = filteredCampaigns.filter(c => c.status === 'in_progress').length;
  const scheduledCampaigns = filteredCampaigns.filter(c => c.status === 'scheduled').length;
  const totalServersInMaintenance = filteredCampaigns
    .filter(c => c.status === 'in_progress')
    .reduce((sum, c) => sum + c.total_servers, 0);

  const handleTemplateSelect = (template: any) => {
    // Pre-populate campaign dialog with template data
    setIsCampaignDialogOpen(true);
  };

  const handleCampaignSelect = (campaignId: string, selected: boolean) => {
    if (selected) {
      setSelectedCampaigns(prev => [...prev, campaignId]);
    } else {
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId));
    }
  };

  // Real-time updates
  useEffect(() => {
    if (!isLoading) {
      const channel = supabase
        .channel('campaign-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'update_orchestration_plans'
          },
          () => {
            loadData(); // Refresh data on changes
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 bg-muted/20 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-lg border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Update Management Center
          </h2>
          <p className="text-muted-foreground">Enterprise Dell server update campaigns and maintenance orchestration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTemplatesModalOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCampaignDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Campaign Filters */}
      <CampaignFilters 
        onFiltersChange={setFilters}
        datacenters={datacenters}
      />

      {/* Bulk Actions */}
      <BulkCampaignActions
        campaigns={filteredCampaigns}
        selectedCampaigns={selectedCampaigns}
        onSelectionChange={setSelectedCampaigns}
        onCampaignsUpdate={loadData}
      />

      {/* Update Management Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {totalServersInMaintenance} servers in maintenance
            </p>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCampaigns}</div>
            <p className="text-xs text-muted-foreground">Upcoming campaigns</p>
          </CardContent>
        </Card>


        <Card className="card-enterprise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Datacenters</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{datacenters.length}</div>
            <p className="text-xs text-muted-foreground">Under management</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">Update Campaigns</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
            <Card className="card-enterprise">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Update Campaigns ({filteredCampaigns.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCampaigns.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCampaigns(filteredCampaigns.map(c => c.id));
                            } else {
                              setSelectedCampaigns([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Targets</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow 
                        key={campaign.id}
                        className={selectedCampaigns.includes(campaign.id) ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedCampaigns.includes(campaign.id)}
                            onCheckedChange={(checked) => handleCampaignSelect(campaign.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div 
                              className="font-medium cursor-pointer hover:text-primary"
                              onClick={() => setSelectedCampaignId(campaign.id)}
                            >
                              {campaign.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {campaign.components.join(', ')} • {campaign.rollout_strategy}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPriorityBadge(campaign.priority)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.total_servers} servers</div>
                            <div className="text-xs text-muted-foreground">
                              {campaign.target_datacenters.join(', ')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Progress value={campaign.progress} className="w-20" />
                            <div className="text-xs text-muted-foreground">
                              {campaign.completed_servers}/{campaign.total_servers}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {campaign.status === 'in_progress' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCampaignAction(campaign.id, 'pause')}
                              >
                                <PauseCircle className="w-3 h-3" />
                              </Button>
                            )}
                            {campaign.status === 'paused' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCampaignAction(campaign.id, 'resume')}
                              >
                                <PlayCircle className="w-3 h-3" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedCampaignId(campaign.id)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredCampaigns.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
                    <p>Create your first update campaign to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Emergency Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="destructive" 
                  className="h-auto p-4"
                  onClick={() => handleEmergencyAction('security_patch')}
                >
                  <div className="text-center">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Emergency Security Patch</div>
                    <div className="text-xs opacity-90">Critical vulnerability patching</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4"
                  onClick={() => handleEmergencyAction('idrac_update')}
                >
                  <div className="text-center">
                    <Shield className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Emergency iDRAC Update</div>
                    <div className="text-xs opacity-90">Out-of-band management fix</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CampaignCreationDialog
        open={isCampaignDialogOpen}
        onOpenChange={setIsCampaignDialogOpen}
        datacenters={datacenters.map(dc => ({
          ...dc,
          location: dc.location || null,
          timezone: dc.timezone || 'UTC',
          maintenance_window_start: dc.maintenance_window_start || '02:00:00',
          maintenance_window_end: dc.maintenance_window_end || '06:00:00',
          is_active: dc.is_active ?? true
        }))}
        onCampaignCreated={loadData}
      />

      <CampaignTemplatesModal
        open={isTemplatesModalOpen}
        onOpenChange={setIsTemplatesModalOpen}
        onTemplateSelect={handleTemplateSelect}
      />

      <CampaignDetailsModal
        open={!!selectedCampaignId}
        onOpenChange={(open) => !open && setSelectedCampaignId(null)}
        campaignId={selectedCampaignId}
        onCampaignUpdate={loadData}
      />

    </div>
  );
}