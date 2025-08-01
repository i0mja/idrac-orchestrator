import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play,
  Pause,
  RefreshCw
} from "lucide-react";

interface UpdateOrchestratorProps {
  servers: any[];
  fleetStatus: any[];
  onUpdateComplete: () => void;
}

export function UpdateOrchestrator({ servers, fleetStatus, onUpdateComplete }: UpdateOrchestratorProps) {
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [updateType, setUpdateType] = useState<'immediate' | 'scheduled' | 'maintenance_window'>('immediate');
  const [updateComponents, setUpdateComponents] = useState<string[]>(['bios', 'idrac']);
  const [scheduledTime, setScheduledTime] = useState('');
  const [maxParallel, setMaxParallel] = useState('3');
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState<any>(null);
  const { toast } = useToast();

  const componentOptions = [
    { id: 'bios', label: 'BIOS', icon: '🖥️' },
    { id: 'idrac', label: 'iDRAC', icon: '🔧' },
    { id: 'storage', label: 'Storage Controllers', icon: '💾' },
    { id: 'network', label: 'Network Adapters', icon: '🌐' }
  ];

  const handleOrchestration = async () => {
    if (selectedServers.length === 0) {
      toast({
        title: "No Servers Selected",
        description: "Please select servers to update",
        variant: "destructive",
      });
      return;
    }

    if (updateComponents.length === 0) {
      toast({
        title: "No Components Selected",
        description: "Please select firmware components to update",
        variant: "destructive",
      });
      return;
    }

    setIsOrchestrating(true);
    setOrchestrationResult(null);

    try {
      console.log('Starting update orchestration...');

      const requestBody: any = {
        serverIds: selectedServers,
        updateType,
        updateComponents,
        forceUpdate: false,
        rollbackOnFailure: true,
        maxParallelUpdates: parseInt(maxParallel)
      };

      if (updateType === 'scheduled' && scheduledTime) {
        requestBody.scheduledTime = scheduledTime;
      }

      const { data, error } = await supabase.functions.invoke('orchestrate-updates', {
        body: requestBody
      });

      if (error) throw error;

      setOrchestrationResult(data);

      toast({
        title: "Update Orchestration Complete",
        description: `Planned ${data.plannedUpdates} updates across ${selectedServers.length} servers`,
      });

      onUpdateComplete();

    } catch (error) {
      console.error('Orchestration failed:', error);
      toast({
        title: "Orchestration Failed",
        description: "Failed to orchestrate firmware updates",
        variant: "destructive",
      });
    } finally {
      setIsOrchestrating(false);
    }
  };

  const getCriticalityBadge = (server: any) => {
    if (server.criticalUpdates > 0) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (server.availableUpdates > 0) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Updates Available</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600">Up to Date</Badge>;
  };

  const getEstimatedDuration = () => {
    const baseTime = {
      bios: 15,
      idrac: 10,
      storage: 8,
      network: 5
    };
    
    const componentTime = updateComponents.reduce((total, comp) => 
      total + (baseTime[comp as keyof typeof baseTime] || 10), 0
    );
    
    const parallelFactor = Math.ceil(selectedServers.length / parseInt(maxParallel));
    return componentTime * parallelFactor;
  };

  return (
    <div className="space-y-6">
      {/* Update Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Update Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Update Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Update Type</label>
              <Select value={updateType} onValueChange={(value: any) => setUpdateType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="maintenance_window">Maintenance Window</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {updateType === 'scheduled' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Scheduled Time</label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Parallel Updates</label>
              <Select value={maxParallel} onValueChange={setMaxParallel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (Sequential)</SelectItem>
                  <SelectItem value="3">3 (Recommended)</SelectItem>
                  <SelectItem value="5">5 (Aggressive)</SelectItem>
                  <SelectItem value="10">10 (Maximum)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Component Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Firmware Components</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {componentOptions.map((component) => (
                <div key={component.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={component.id}
                    checked={updateComponents.includes(component.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setUpdateComponents([...updateComponents, component.id]);
                      } else {
                        setUpdateComponents(updateComponents.filter(c => c !== component.id));
                      }
                    }}
                  />
                  <label htmlFor={component.id} className="text-sm font-medium cursor-pointer">
                    {component.icon} {component.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Duration */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Estimated duration: <strong>{getEstimatedDuration()} minutes</strong> for {selectedServers.length} servers with {updateComponents.length} components
              {updateType === 'immediate' && selectedServers.length > parseInt(maxParallel) && (
                <span className="text-orange-600"> (updates will run in batches of {maxParallel})</span>
              )}
            </AlertDescription>
          </Alert>

          {/* Orchestration Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleOrchestration}
              disabled={isOrchestrating || selectedServers.length === 0}
              className="gap-2"
            >
              {isOrchestrating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isOrchestrating ? 'Orchestrating...' : `Orchestrate Updates (${selectedServers.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Server Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Server Selection</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedServers(fleetStatus.map(s => s.serverId))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedServers([])}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fleetStatus.map((server) => (
              <div key={server.serverId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedServers.includes(server.serverId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedServers([...selectedServers, server.serverId]);
                      } else {
                        setSelectedServers(selectedServers.filter(id => id !== server.serverId));
                      }
                    }}
                  />
                  
                  <div>
                    <h4 className="font-medium">{server.hostname}</h4>
                    <p className="text-sm text-muted-foreground">{server.model}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status */}
                  <div className="flex items-center gap-1">
                    {server.status === 'online' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm capitalize">{server.status}</span>
                  </div>

                  {/* Updates */}
                  <div className="text-sm">
                    {server.availableUpdates > 0 ? (
                      <span className="text-orange-600">
                        {server.availableUpdates} updates
                      </span>
                    ) : (
                      <span className="text-green-600">Up to date</span>
                    )}
                  </div>

                  {/* Criticality */}
                  {getCriticalityBadge(server)}
                </div>
              </div>
            ))}
          </div>

          {fleetStatus.length === 0 && (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Servers Available</h3>
              <p className="text-muted-foreground">
                Run fleet discovery first to see available servers
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orchestration Results */}
      {orchestrationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Orchestration Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Planned Updates</h4>
                <p className="text-2xl font-bold text-blue-600">{orchestrationResult.plannedUpdates}</p>
                <p className="text-sm text-blue-700">Across {orchestrationResult.summary?.totalServers} servers</p>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Jobs Created</h4>
                <p className="text-2xl font-bold text-green-600">{orchestrationResult.createdJobs}</p>
                <p className="text-sm text-green-700">Update jobs scheduled</p>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Components</h4>
                <p className="text-2xl font-bold text-orange-600">{orchestrationResult.summary?.totalComponents}</p>
                <p className="text-sm text-orange-700">Firmware components</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Execution Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Update Type:</span> {orchestrationResult.updateType}
                </div>
                <div>
                  <span className="font-medium">Estimated Duration:</span> {orchestrationResult.summary?.estimatedDuration} minutes
                </div>
                <div>
                  <span className="font-medium">Critical Updates:</span> {orchestrationResult.summary?.criticalUpdates}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <Badge variant="outline" className="ml-2">
                    {orchestrationResult.execution?.type === 'immediate' ? 'Started' : 'Scheduled'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}