import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  RefreshCw, 
  Play, 
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  Server,
  Shield
} from "lucide-react";

interface OrchestrationJob {
  id: string;
  name: string;
  cluster_name?: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  currentHost?: string;
  totalHosts: number;
  completedHosts: number;
  failedHosts: number;
  strategy: 'sequential' | 'parallel' | 'rolling';
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface UpdateOrchestratorSchedulerProps {
  servers?: any[];
  fleetStatus?: any[];
}

export function UpdateOrchestratorScheduler({ servers = [], fleetStatus = [] }: UpdateOrchestratorSchedulerProps) {
  const [orchestrationJobs, setOrchestrationJobs] = useState<OrchestrationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOrchestrationJobs();
  }, []);

  const loadOrchestrationJobs = async () => {
    setIsLoading(true);
    try {
      // Mock data for now since the edge function has issues
      // TODO: Implement proper orchestration backend
      
      // Mock data for now - in real implementation this would come from the database
      const mockJobs: OrchestrationJob[] = [
        {
          id: '1',
          name: 'Production Cluster Q1 Updates',
          cluster_name: 'Production',
          status: 'running',
          progress: 45,
          currentHost: 'ESXi-PROD-02',
          totalHosts: 5,
          completedHosts: 2,
          failedHosts: 0,
          strategy: 'rolling',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          started_at: new Date(Date.now() - 2700000).toISOString()
        },
        {
          id: '2',
          name: 'Development Cluster Security Updates',
          cluster_name: 'Development',
          status: 'completed',
          progress: 100,
          totalHosts: 3,
          completedHosts: 3,
          failedHosts: 0,
          strategy: 'parallel',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          started_at: new Date(Date.now() - 84000000).toISOString(),
          completed_at: new Date(Date.now() - 82800000).toISOString()
        }
      ];
      
      setOrchestrationJobs(mockJobs);
    } catch (error) {
      console.error('Failed to load orchestration jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load orchestration jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startOrchestration = async (clusterName: string) => {
    try {
      // Mock implementation for now
      toast({
        title: "Orchestration Started",
        description: `Rolling update started for cluster ${clusterName}`,
      });
      
      await loadOrchestrationJobs();
    } catch (error) {
      console.error('Failed to start orchestration:', error);
      toast({
        title: "Error",
        description: "Failed to start update orchestration",
        variant: "destructive",
      });
    }
  };

  const pauseOrchestration = async (jobId: string) => {
    try {
      // Mock implementation
      toast({
        title: "Orchestration Paused",
        description: "Update orchestration has been paused",
      });
      
      await loadOrchestrationJobs();
    } catch (error) {
      console.error('Failed to pause orchestration:', error);
      toast({
        title: "Error",
        description: "Failed to pause orchestration",
        variant: "destructive",
      });
    }
  };

  const resumeOrchestration = async (jobId: string) => {
    try {
      // Mock implementation
      toast({
        title: "Orchestration Resumed",
        description: "Update orchestration has been resumed",
      });
      
      await loadOrchestrationJobs();
    } catch (error) {
      console.error('Failed to resume orchestration:', error);
      toast({
        title: "Error",
        description: "Failed to resume orchestration",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <Badge className="bg-blue-500"><Play className="w-3 h-3 mr-1" />Running</Badge>;
      case 'paused': return <Badge className="bg-orange-500"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'completed': return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed': return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Idle</Badge>;
    }
  };

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case 'rolling': return <Badge variant="outline" className="text-blue-600">Rolling</Badge>;
      case 'parallel': return <Badge variant="outline" className="text-green-600">Parallel</Badge>;
      case 'sequential': return <Badge variant="outline" className="text-orange-600">Sequential</Badge>;
      default: return <Badge variant="outline">{strategy}</Badge>;
    }
  };

  // Get clusters from servers
  const clusters = Array.from(new Set(servers.map(s => s.cluster_name).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Update Orchestration</h3>
          <p className="text-sm text-muted-foreground">
            Coordinate rolling firmware updates across vCenter clusters
          </p>
        </div>
        <Button onClick={loadOrchestrationJobs} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Cluster Quick Actions */}
      {clusters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Available Clusters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clusters.map((cluster) => {
                const clusterServers = servers.filter(s => s.cluster_name === cluster);
                const onlineHosts = clusterServers.filter(s => s.status === 'online').length;
                const hasRunningJob = orchestrationJobs.some(job => 
                  job.cluster_name === cluster && job.status === 'running'
                );

                return (
                  <div key={cluster} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{cluster}</h4>
                      <Badge variant="outline">{clusterServers.length} hosts</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {onlineHosts} online • {clusterServers.length - onlineHosts} offline
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full" 
                      disabled={hasRunningJob || onlineHosts < 2}
                      onClick={() => startOrchestration(cluster)}
                    >
                      {hasRunningJob ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Running
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Rolling Update
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Orchestration Jobs */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading orchestration jobs...</span>
          </div>
        ) : orchestrationJobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Orchestrations</h3>
              <p className="text-muted-foreground mb-4">
                Start rolling updates for your vCenter clusters above
              </p>
            </CardContent>
          </Card>
        ) : (
          orchestrationJobs.map((job) => (
            <Card key={job.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    {job.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getStrategyBadge(job.strategy)}
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                {job.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Progress: {job.currentHost ? `Updating ${job.currentHost}` : 'Preparing...'}
                      </span>
                      <span>{job.progress}%</span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Hosts:</span>
                    <p className="font-medium">{job.totalHosts}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <p className="font-medium text-green-600">{job.completedHosts}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Failed:</span>
                    <p className="font-medium text-red-600">{job.failedHosts}</p>
                  </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <p className="font-medium">
                      {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <p className="font-medium">
                      {job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  {job.status === 'running' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => pauseOrchestration(job.id)}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  {job.status === 'paused' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resumeOrchestration(job.id)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}