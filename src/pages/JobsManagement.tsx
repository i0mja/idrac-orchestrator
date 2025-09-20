import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Settings, Play, Square, RotateCcw, Eye, Search, Filter,
  Activity, CheckCircle, AlertTriangle, Clock, Zap, TrendingUp,
  Server, Database, Workflow, Download, Upload, Trash2
} from 'lucide-react';
import { useJobsManagement, UnifiedJob } from '@/hooks/useJobsManagement';
import { useToast } from '@/hooks/use-toast';

const JobsManagement = () => {
  const {
    jobs,
    loading,
    statistics,
    performanceMetrics,
    filters,
    setFilters,
    cancelJob,
    retryJob,
    bulkCancel,
    bulkRetry
  } = useJobsManagement();

  const { toast } = useToast();
  
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<UnifiedJob | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      case 'queued':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500 text-white';
      case 'completed':
        return 'bg-green-500 text-white';
      case 'failed':
        return 'bg-red-500 text-white';
      case 'cancelled':
        return 'bg-gray-500 text-white';
      case 'queued':
      case 'pending':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'background':
        return <Database className="h-4 w-4" />;
      case 'update':
        return <Download className="h-4 w-4" />;
      case 'state_machine':
        return <Workflow className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const handleJobSelection = (jobId: string, checked: boolean) => {
    const newSelection = new Set(selectedJobs);
    if (checked) {
      newSelection.add(jobId);
    } else {
      newSelection.delete(jobId);
    }
    setSelectedJobs(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(new Set(jobs.map(job => job.id)));
    } else {
      setSelectedJobs(new Set());
    }
  };

  const handleBulkCancel = async () => {
    if (selectedJobs.size === 0) return;
    
    await bulkCancel(Array.from(selectedJobs));
    setSelectedJobs(new Set());
  };

  const handleBulkRetry = async () => {
    if (selectedJobs.size === 0) return;
    
    await bulkRetry(Array.from(selectedJobs));
    setSelectedJobs(new Set());
  };

  const handleCancelJob = async (job: UnifiedJob) => {
    try {
      await cancelJob(job.id, job.type);
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

  const handleRetryJob = async (job: UnifiedJob) => {
    try {
      await retryJob(job.id, job.type);
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

  const filteredJobs = jobs.filter(job => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        job.id.toLowerCase().includes(term) ||
        job.category.toLowerCase().includes(term) ||
        job.serverId?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const renderJobCard = (job: UnifiedJob) => (
    <Card key={job.id} className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedJobs.has(job.id)}
              onCheckedChange={(checked) => handleJobSelection(job.id, !!checked)}
            />
            <div className="flex items-center gap-2">
              {getTypeIcon(job.type)}
              {getStatusIcon(job.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{job.category.replace('_', ' ').toUpperCase()}</span>
                  <Badge className={getStatusColor(job.status)}>
                    {job.status}
                  </Badge>
                  <Badge variant="outline">{job.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ID: {job.id.slice(0, 8)}...
                  {job.serverId && <> • Server: {job.serverId.slice(0, 8)}...</>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedJob(job);
                setShowJobDetails(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {(job.status === 'running' || job.status === 'queued' || job.status === 'pending') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelJob(job)}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
            {job.status === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRetryJob(job)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {job.status === 'running' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{job.progress}%</span>
              </div>
              <Progress value={job.progress} className="w-full" />
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Created: {new Date(job.createdAt).toLocaleString()}</span>
            {job.completedAt && (
              <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>
            )}
          </div>
          
          {job.errorMessage && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {job.errorMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading jobs management...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-primary via-primary-glow to-primary-variant rounded-xl flex items-center justify-center shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary-variant bg-clip-text text-transparent">
              Jobs Management Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Unified monitoring and control for all background operations
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <h3 className="text-2xl font-bold text-primary">{statistics.total}</h3>
              </div>
              <Settings className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Running</p>
                <h3 className="text-2xl font-bold text-blue-500">{statistics.running}</h3>
              </div>
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queued</p>
                <h3 className="text-2xl font-bold text-yellow-500">{statistics.queued}</h3>
              </div>
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <h3 className="text-2xl font-bold text-green-500">{statistics.completed}</h3>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <h3 className="text-2xl font-bold text-red-500">{statistics.failed}</h3>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <h3 className="text-2xl font-bold text-purple-500">{performanceMetrics.successRate}%</h3>
              </div>
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg Execution Time</span>
                <span className="font-medium">{performanceMetrics.averageExecutionTime}min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Throughput</span>
                <span className="font-medium">{performanceMetrics.throughput} jobs/hr</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Success Rate</span>
                <span className="font-medium">{performanceMetrics.successRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle>Job Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Background Jobs</span>
                <Badge variant="outline">{statistics.backgroundJobs}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Update Jobs</span>
                <Badge variant="outline">{statistics.updateJobs}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">State Machines</span>
                <Badge variant="outline">{statistics.hostRuns}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={selectedJobs.size === 0}
                onClick={handleBulkCancel}
              >
                <Square className="w-4 h-4 mr-2" />
                Cancel Selected ({selectedJobs.size})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={selectedJobs.size === 0}
                onClick={handleBulkRetry}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Selected ({selectedJobs.size})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card className="card-enterprise">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Jobs</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <Select onValueChange={(value) => setFilters({...filters, type: value ? [value] : undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="background">Background</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="state_machine">State Machine</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select onValueChange={(value) => setFilters({...filters, status: value ? [value] : undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({})}
                >
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedJobs.size > 0 && (
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm font-medium">{selectedJobs.size} jobs selected</span>
                <Button size="sm" variant="outline" onClick={handleBulkCancel}>
                  <Square className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkRetry}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedJobs(new Set())}>
                  Clear Selection
                </Button>
              </div>
            )}

            {/* Select All */}
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all {filteredJobs.length} jobs
                {selectedJobs.size > 0 && selectedJobs.size < filteredJobs.length && (
                  <span className="ml-1 text-blue-600">({selectedJobs.size} selected)</span>
                )}
              </span>
            </div>

            {/* Jobs List */}
            <ScrollArea className="h-[600px]">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map(renderJobCard)}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Job Details Dialog */}
      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about the selected job
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Job ID</label>
                  <p className="text-sm text-muted-foreground">{selectedJob.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedJob.type)}
                    <Badge variant="outline">{selectedJob.type}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-muted-foreground">{selectedJob.category}</p>
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
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{selectedJob.progress}%</p>
                    <Progress value={selectedJob.progress} className="w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Server ID</label>
                  <p className="text-sm text-muted-foreground">{selectedJob.serverId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created At</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedJob.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedJob.completedAt && (
                  <div>
                    <label className="text-sm font-medium">Completed At</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedJob.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              
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
                  <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-40">
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

export default JobsManagement;