import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Clock, Play, Square, RotateCcw, Eye } from 'lucide-react';
import { useBackgroundJobs, BackgroundJob } from '@/hooks/useBackgroundJobs';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const BackgroundJobsPanel = () => {
  const { 
    jobs, 
    loading, 
    error, 
    jobStats, 
    runningJobs, 
    queuedJobs, 
    failedJobs,
    cancelJob,
    retryJob
  } = useBackgroundJobs();
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<BackgroundJob | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelJob(jobId);
      toast({
        title: "Success",
        description: "Job cancelled successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive"
      });
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryJob(jobId);
      toast({
        title: "Success", 
        description: "Job queued for retry",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry job",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (job: BackgroundJob) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const renderJobCard = (job: BackgroundJob) => (
    <Card key={job.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            <CardTitle className="text-base">
              {job.type.replace('_', ' ').toUpperCase()}
            </CardTitle>
            <Badge variant="outline" className={getStatusColor(job.status)}>
              {job.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(job)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {job.status === 'running' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelJob(job.id)}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
            {job.status === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRetryJob(job.id)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Server: {job.serverId} • Created: {new Date(job.createdAt).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {job.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="w-full" />
          </div>
        )}
        {job.errorMessage && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {job.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading jobs...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Error loading jobs: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{jobStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{jobStats.running}</div>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{jobStats.queued}</div>
            <p className="text-xs text-muted-foreground">Queued</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{jobStats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Lists */}
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
          <CardDescription>
            Monitor and manage background job execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({jobStats.total})</TabsTrigger>
              <TabsTrigger value="running">Running ({jobStats.running})</TabsTrigger>
              <TabsTrigger value="queued">Queued ({jobStats.queued})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({jobStats.failed})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <ScrollArea className="h-[600px]">
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.map(renderJobCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="running">
              <ScrollArea className="h-[600px]">
                {runningJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No running jobs
                  </div>
                ) : (
                  <div className="space-y-4">
                    {runningJobs.map(renderJobCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="queued">
              <ScrollArea className="h-[600px]">
                {queuedJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No queued jobs
                  </div>
                ) : (
                  <div className="space-y-4">
                    {queuedJobs.map(renderJobCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="failed">
              <ScrollArea className="h-[600px]">
                {failedJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No failed jobs
                  </div>
                ) : (
                  <div className="space-y-4">
                    {failedJobs.map(renderJobCard)}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Job Details Dialog */}
      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected job
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Job ID</label>
                  <p className="text-sm text-muted-foreground">{selectedJob.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">{selectedJob.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedJob.status)}
                    <Badge className={getStatusColor(selectedJob.status)}>
                      {selectedJob.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Progress</label>
                  <p className="text-sm text-muted-foreground">{selectedJob.progress}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Server ID</label>
                  <p className="text-sm text-muted-foreground">{selectedJob.serverId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created At</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedJob.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {selectedJob.logs && (
                <div>
                  <label className="text-sm font-medium">Logs</label>
                  <Textarea
                    value={selectedJob.logs}
                    readOnly
                    className="h-32 font-mono text-xs"
                  />
                </div>
              )}
              
              {selectedJob.errorMessage && (
                <div>
                  <label className="text-sm font-medium">Error Message</label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {selectedJob.errorMessage}
                  </div>
                </div>
              )}
              
              {selectedJob.metadata && Object.keys(selectedJob.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium">Metadata</label>
                  <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
                    {JSON.stringify(selectedJob.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackgroundJobsPanel;