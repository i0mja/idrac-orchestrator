import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Play,
  Pause,
  Square,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal
} from "lucide-react";

interface BulkCampaignActionsProps {
  campaigns: any[];
  selectedCampaigns: string[];
  onSelectionChange: (selected: string[]) => void;
  onCampaignsUpdate: () => void;
}

export function BulkCampaignActions({
  campaigns,
  selectedCampaigns,
  onSelectionChange,
  onCampaignsUpdate
}: BulkCampaignActionsProps) {
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const selectedCampaignObjects = campaigns.filter(c => selectedCampaigns.includes(c.id));
  
  const canPerformAction = (action: string) => {
    switch (action) {
      case 'start':
        return selectedCampaignObjects.some(c => c.status === 'scheduled' || c.status === 'draft');
      case 'pause':
        return selectedCampaignObjects.some(c => c.status === 'in_progress');
      case 'resume':
        return selectedCampaignObjects.some(c => c.status === 'paused');
      case 'cancel':
        return selectedCampaignObjects.some(c => 
          ['scheduled', 'in_progress', 'paused', 'draft'].includes(c.status)
        );
      case 'delete':
        return selectedCampaignObjects.some(c => 
          ['completed', 'failed', 'cancelled', 'draft'].includes(c.status)
        );
      default:
        return false;
    }
  };

  const getActionDescription = (action: string) => {
    const count = selectedCampaigns.length;
    switch (action) {
      case 'start':
        return `Start ${count} campaign${count !== 1 ? 's' : ''}`;
      case 'pause':
        return `Pause ${count} running campaign${count !== 1 ? 's' : ''}`;
      case 'resume':
        return `Resume ${count} paused campaign${count !== 1 ? 's' : ''}`;
      case 'cancel':
        return `Cancel ${count} campaign${count !== 1 ? 's' : ''}`;
      case 'delete':
        return `Delete ${count} campaign${count !== 1 ? 's' : ''}`;
      default:
        return '';
    }
  };

  const executeBulkAction = async () => {
    if (!selectedAction || selectedCampaigns.length === 0) return;

    setIsProcessing(true);
    try {
      const updates: any = {};
      let logMessage = '';

      switch (selectedAction) {
        case 'start':
          updates.status = 'in_progress';
          updates.started_at = new Date().toISOString();
          logMessage = 'Campaign started via bulk action';
          break;
        case 'pause':
          updates.status = 'paused';
          logMessage = 'Campaign paused via bulk action';
          break;
        case 'resume':
          updates.status = 'in_progress';
          logMessage = 'Campaign resumed via bulk action';
          break;
        case 'cancel':
          updates.status = 'cancelled';
          logMessage = 'Campaign cancelled via bulk action';
          break;
        case 'delete':
          // Delete campaigns
          const { error: deleteError } = await supabase
            .from('update_orchestration_plans')
            .delete()
            .in('id', selectedCampaigns);

          if (deleteError) throw deleteError;

          toast({
            title: "Campaigns Deleted",
            description: `${selectedCampaigns.length} campaign${selectedCampaigns.length !== 1 ? 's' : ''} deleted successfully`,
          });

          onSelectionChange([]);
          onCampaignsUpdate();
          setIsActionDialogOpen(false);
          return;
      }

      // Update campaigns
      const { error: updateError } = await supabase
        .from('update_orchestration_plans')
        .update(updates)
        .in('id', selectedCampaigns);

      if (updateError) throw updateError;

      // Log the action for each campaign
      const logEntries = selectedCampaigns.map(campaignId => ({
        campaign_id: campaignId,
        log_level: 'info',
        message: logMessage,
        metadata: { bulk_action: true, action: selectedAction }
      }));

      await supabase
        .from('campaign_execution_logs')
        .insert(logEntries);

      // Create system events
      const eventEntries = selectedCampaigns.map(campaignId => {
        const campaign = campaigns.find(c => c.id === campaignId);
        return {
          title: `Bulk Action: ${selectedAction}`,
          description: `Campaign "${campaign?.name}" ${selectedAction}ed via bulk operation`,
          event_type: `campaign_${selectedAction}`,
          severity: selectedAction === 'cancel' ? 'warning' : 'info',
          metadata: { campaign_id: campaignId, bulk_action: true }
        };
      });

      await supabase
        .from('system_events')
        .insert(eventEntries);

      toast({
        title: "Bulk Action Completed",
        description: getActionDescription(selectedAction) + " successfully",
      });

      onSelectionChange([]);
      onCampaignsUpdate();
      setIsActionDialogOpen(false);

    } catch (error) {
      console.error('Error executing bulk action:', error);
      toast({
        title: "Bulk Action Failed",
        description: "Failed to execute bulk action on selected campaigns",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectAll = () => {
    if (selectedCampaigns.length === campaigns.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(campaigns.map(c => c.id));
    }
  };

  const selectByStatus = (status: string) => {
    const campaignsWithStatus = campaigns.filter(c => c.status === status).map(c => c.id);
    onSelectionChange([...new Set([...selectedCampaigns, ...campaignsWithStatus])]);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Bulk Actions</CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
              onCheckedChange={selectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedCampaigns.length} of {campaigns.length} selected
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Quick select:</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectByStatus('scheduled')}
            >
              Scheduled ({campaigns.filter(c => c.status === 'scheduled').length})
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectByStatus('in_progress')}
            >
              Running ({campaigns.filter(c => c.status === 'in_progress').length})
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectByStatus('paused')}
            >
              Paused ({campaigns.filter(c => c.status === 'paused').length})
            </Button>
          </div>

          <div className="flex-1" />

          {/* Bulk Actions */}
          {selectedCampaigns.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedCampaigns.length} selected
              </Badge>
              
              {canPerformAction('start') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAction('start');
                    setIsActionDialogOpen(true);
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
              )}
              
              {canPerformAction('pause') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAction('pause');
                    setIsActionDialogOpen(true);
                  }}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              
              {canPerformAction('resume') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAction('resume');
                    setIsActionDialogOpen(true);
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}

              {canPerformAction('cancel') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAction('cancel');
                    setIsActionDialogOpen(true);
                  }}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}

              {canPerformAction('delete') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAction('delete');
                    setIsActionDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectionChange([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Bulk Action
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are about to <strong>{selectedAction}</strong> {selectedCampaigns.length} campaign
                {selectedCampaigns.length !== 1 ? 's' : ''}. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Affected Campaigns:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedCampaignObjects.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between text-sm p-2 rounded border">
                    <span className="font-medium">{campaign.name}</span>
                    <Badge variant="outline">{campaign.status}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={executeBulkAction} 
                disabled={isProcessing}
                variant={selectedAction === 'delete' ? 'destructive' : 'default'}
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirm {selectedAction}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}