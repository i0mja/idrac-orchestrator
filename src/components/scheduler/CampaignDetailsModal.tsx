import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Activity,
  Clock,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Tag,
  User,
  Calendar
} from "lucide-react";

interface CampaignDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  onCampaignUpdate: () => void;
}

interface CampaignDetails {
  id: string;
  name: string;
  status: string;
  priority: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_duration?: string;
  actual_duration?: string;
  progress: number;
  total_servers: number;
  completed_servers: number;
  failed_servers: number;
  server_ids: string[];
  update_sequence: any;
  safety_checks: any;
  tags?: string[];
  created_by: string;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  approval_comments?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
}

export function CampaignDetailsModal({ 
  open, 
  onOpenChange, 
  campaignId, 
  onCampaignUpdate 
}: CampaignDetailsModalProps) {
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && campaignId) {
      loadCampaignDetails();
    }
  }, [open, campaignId]);

  const loadCampaignDetails = async () => {
    if (!campaignId) return;
    
    setIsLoading(true);
    try {
      // Load campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('update_orchestration_plans')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Calculate progress
      const totalServers = campaignData.server_ids?.length || 0;
      const progress = totalServers > 0 ? Math.round((campaignData.current_step / totalServers) * 100) : 0;

      setCampaign({
        ...campaignData,
        priority: (campaignData.update_sequence as any)?.priority || 'medium',
        estimated_duration: campaignData.estimated_duration as string,
        actual_duration: campaignData.actual_duration as string,
        progress,
        total_servers: totalServers,
        completed_servers: campaignData.current_step || 0,
        failed_servers: 0 // TODO: Calculate from logs
      });

      // Load execution logs
      const { data: logsData } = await supabase
        .from('campaign_execution_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(100);

      setLogs(logsData || []);

      // Load servers
      if (campaignData.server_ids?.length > 0) {
        const { data: serversData } = await supabase
          .from('servers')
          .select('id, hostname, status, model, datacenter')
          .in('id', campaignData.server_ids);

        setServers(serversData || []);
      }

      // Load approvals
      const { data: approvalsData } = await supabase
        .from('campaign_approvals')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      setApprovals(approvalsData || []);

    } catch (error) {
      console.error('Error loading campaign details:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignAction = async (action: 'pause' | 'resume' | 'retry' | 'cancel') => {
    if (!campaign) return;

    try {
      let newStatus = campaign.status;
      let updateData: any = {};

      switch (action) {
        case 'pause':
          newStatus = 'paused';
          break;
        case 'resume':
          newStatus = 'in_progress';
          break;
        case 'retry':
          updateData.retry_count = (campaign.retry_count || 0) + 1;
          newStatus = 'in_progress';
          break;
        case 'cancel':
          newStatus = 'cancelled';
          break;
      }

      await supabase
        .from('update_orchestration_plans')
        .update({ status: newStatus, ...updateData })
        .eq('id', campaign.id);

      // Log the action
      await supabase
        .from('campaign_execution_logs')
        .insert({
          campaign_id: campaign.id,
          log_level: 'info',
          message: `Campaign ${action}ed by user`
        });

      toast({
        title: "Success",
        description: `Campaign ${action}ed successfully`
      });

      loadCampaignDetails();
      onCampaignUpdate();

    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} campaign`,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!campaign || isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(campaign.status)}
              <DialogTitle className="text-xl">{campaign.name}</DialogTitle>
              <Badge variant={campaign.status === 'completed' ? 'default' : 'secondary'}>
                {campaign.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              {campaign.status === 'in_progress' && (
                <Button size="sm" variant="outline" onClick={() => handleCampaignAction('pause')}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              {campaign.status === 'paused' && (
                <Button size="sm" variant="outline" onClick={() => handleCampaignAction('resume')}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              {(campaign.status === 'failed' && campaign.retry_count < campaign.max_retries) && (
                <Button size="sm" variant="outline" onClick={() => handleCampaignAction('retry')}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry ({campaign.retry_count}/{campaign.max_retries})
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="servers">Servers ({campaign.total_servers})</TabsTrigger>
            <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="overview" className="space-y-6">
              {/* Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Overall Progress</span>
                      <span className="font-medium">{campaign.progress}%</span>
                    </div>
                    <Progress value={campaign.progress} className="h-2" />
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-green-600">{campaign.completed_servers}</div>
                        <div className="text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-600">
                          {campaign.total_servers - campaign.completed_servers - campaign.failed_servers}
                        </div>
                        <div className="text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">{campaign.failed_servers}</div>
                        <div className="text-muted-foreground">Failed</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Information */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Created by: {campaign.created_by}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Created: {format(new Date(campaign.created_at), 'PPp')}
                      </span>
                    </div>
                    {campaign.started_at && (
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Started: {format(new Date(campaign.started_at), 'PPp')}
                        </span>
                      </div>
                    )}
                    {campaign.completed_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Completed: {format(new Date(campaign.completed_at), 'PPp')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Update Type:</span>
                      <Badge variant="outline">
                        {campaign.update_sequence?.update_type || 'firmware'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Strategy:</span>
                      <Badge variant="outline">
                        {campaign.update_sequence?.rollout_strategy || 'sequential'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Max Concurrent:</span>
                      <span className="text-sm font-medium">
                        {campaign.safety_checks?.max_concurrent_updates || 1}
                      </span>
                    </div>
                    {campaign.tags && campaign.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {campaign.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Error Information */}
              {campaign.failure_reason && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Failure Reason:</strong> {campaign.failure_reason}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="servers">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Target Servers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {servers.map((server) => (
                      <div key={server.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{server.hostname}</div>
                            <div className="text-sm text-muted-foreground">
                              {server.model} • {server.datacenter}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">{server.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Execution Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        {getLogIcon(log.log_level)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{log.message}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'PPp')}
                            </span>
                          </div>
                          {log.metadata && (
                            <pre className="text-xs text-muted-foreground mt-1 overflow-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No logs available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals">
              <Card>
                <CardHeader>
                  <CardTitle>Approval History</CardTitle>
                </CardHeader>
                <CardContent>
                  {campaign.approval_required ? (
                    <div className="space-y-4">
                      {campaign.approved_by && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Approved by {campaign.approved_by} on{' '}
                            {campaign.approved_at && format(new Date(campaign.approved_at), 'PPp')}
                            {campaign.approval_comments && (
                              <div className="mt-2">
                                <strong>Comments:</strong> {campaign.approval_comments}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-2">
                        {approvals.map((approval) => (
                          <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <div className="font-medium">{approval.approver_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(approval.created_at), 'PPp')}
                              </div>
                              {approval.comments && (
                                <div className="text-sm mt-1">{approval.comments}</div>
                              )}
                            </div>
                            <Badge variant={
                              approval.status === 'approved' ? 'default' :
                              approval.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {approval.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No approval required for this campaign
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}