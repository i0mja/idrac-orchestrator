import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedServers } from "@/hooks/useEnhancedServers";
import { 
  Settings,
  Calendar,
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
  Zap
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

interface MaintenanceWindow {
  id: string;
  name: string;
  datacenter_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  max_concurrent_updates: number;
  status: 'upcoming' | 'active' | 'completed';
  campaigns_scheduled: number;
}

export function EnhancedCommandControl() {
  const [campaigns, setCampaigns] = useState<UpdateCampaign[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { servers, datacenters } = useEnhancedServers();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Sample update campaigns
      setCampaigns([
        {
          id: '1',
          name: 'Q1 Security Update Campaign',
          target_datacenters: ['DC1-East', 'DC2-West'],
          update_type: 'security_patch',
          components: ['BIOS', 'iDRAC', 'NIC'],
          rollout_strategy: 'sequential',
          status: 'in_progress',
          progress: 35,
          total_servers: 120,
          completed_servers: 42,
          start_date: new Date().toISOString(),
          estimated_completion: new Date(Date.now() + 86400000 * 3).toISOString(),
          created_by: 'admin',
          priority: 'high'
        },
        {
          id: '2',
          name: 'ESXi 8.0 U3 Firmware Compatibility',
          target_datacenters: ['DC1-East'],
          update_type: 'firmware',
          components: ['BIOS', 'Storage Controller'],
          rollout_strategy: 'canary',
          status: 'scheduled',
          progress: 0,
          total_servers: 45,
          completed_servers: 0,
          start_date: new Date(Date.now() + 86400000 * 7).toISOString(),
          estimated_completion: new Date(Date.now() + 86400000 * 10).toISOString(),
          created_by: 'admin',
          priority: 'medium'
        }
      ]);

      // Sample maintenance windows
      setMaintenanceWindows([
        {
          id: '1',
          name: 'Weekend Maintenance - DC1',
          datacenter_id: 'dc1',
          start_time: '02:00',
          end_time: '06:00',
          timezone: 'EST',
          max_concurrent_updates: 3,
          status: 'upcoming',
          campaigns_scheduled: 2
        }
      ]);

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

  const activeCampaigns = campaigns.filter(c => c.status === 'in_progress').length;
  const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled').length;
  const totalServersInMaintenance = campaigns
    .filter(c => c.status === 'in_progress')
    .reduce((sum, c) => sum + c.total_servers, 0);

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
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Maintenance
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

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
            <CardTitle className="text-sm font-medium">Maintenance Windows</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceWindows.length}</div>
            <p className="text-xs text-muted-foreground">Configured windows</p>
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
          <TabsTrigger value="maintenance">Maintenance Windows</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Update Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Targets</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{campaign.name}</div>
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
                            <Button size="sm" variant="outline">
                              <PauseCircle className="w-3 h-3" />
                            </Button>
                          )}
                          {campaign.status === 'paused' && (
                            <Button size="sm" variant="outline">
                              <PlayCircle className="w-3 h-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Monitor className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Maintenance Windows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {maintenanceWindows.map((window) => (
                  <div key={window.id} className="p-4 rounded-lg bg-gradient-subtle border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{window.name}</div>
                      <Badge variant="outline">{window.status}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Time: {window.start_time} - {window.end_time} ({window.timezone})</div>
                      <div>Max Concurrent: {window.max_concurrent_updates}</div>
                      <div>Scheduled Campaigns: {window.campaigns_scheduled}</div>
                    </div>
                  </div>
                ))}
              </div>
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
                <Button variant="destructive" className="h-auto p-4">
                  <div className="text-center">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Emergency Security Patch</div>
                    <div className="text-xs opacity-90">Critical vulnerability patching</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4">
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
    </div>
  );
}