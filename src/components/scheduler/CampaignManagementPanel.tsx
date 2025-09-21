import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Target, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface CampaignData {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  campaign_type: 'firmware_update' | 'security_patch' | 'maintenance' | 'health_check';
  scheduled_date: string;
  start_time: string;
  end_time: string;
  total_servers: number;
  completed_servers: number;
  failed_servers: number;
  created_at: string;
}

export function CampaignManagementPanel() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'firmware_update',
    scheduled_date: '',
    start_time: '',
    end_time: ''
  });
  
  const { toast } = useToast();

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_windows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform maintenance windows to campaign format
      const transformedCampaigns: CampaignData[] = (data || []).map(window => ({
        id: window.id,
        name: window.name,
        description: window.description || '',
        status: window.status as CampaignData['status'],
        campaign_type: 'maintenance',
        scheduled_date: window.scheduled_date,
        start_time: window.start_time,
        end_time: window.end_time,
        total_servers: 0, // Would need to count from server assignments
        completed_servers: 0,
        failed_servers: 0,
        created_at: window.created_at
      }));

      setCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('maintenance_windows')
        .insert({
          name: formData.name,
          description: formData.description,
          scheduled_date: formData.scheduled_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          status: 'scheduled',
          datacenter_id: null // This would come from user selection
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign created successfully"
      });

      setIsCreateOpen(false);
      setFormData({
        name: '',
        description: '',
        campaign_type: 'firmware_update',
        scheduled_date: '',
        start_time: '',
        end_time: ''
      });
      
      loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive"
      });
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_windows')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Campaign ${newStatus} successfully`
      });

      loadCampaigns();
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive"
      });
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase
        .from('maintenance_windows')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign deleted successfully"
      });

      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'running':
        return <Play className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary", 
      cancelled: "destructive",
      scheduled: "outline",
      draft: "outline"
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <Card className="card-enterprise">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Campaign Management
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Campaign description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Campaign Type</Label>
                  <Select value={formData.campaign_type} onValueChange={(value) => setFormData(prev => ({ ...prev, campaign_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="firmware_update">Firmware Update</SelectItem>
                      <SelectItem value="security_patch">Security Patch</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="health_check">Health Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start">Start</Label>
                    <Input
                      id="start"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End</Label>
                    <Input
                      id="end"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createCampaign}>
                    Create Campaign
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No campaigns found. Create your first campaign to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      {campaign.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {campaign.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {campaign.campaign_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(campaign.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{campaign.scheduled_date}</div>
                      <div className="text-muted-foreground">
                        {campaign.start_time} - {campaign.end_time}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{campaign.completed_servers}/{campaign.total_servers} servers</div>
                      {campaign.failed_servers > 0 && (
                        <div className="text-red-600">{campaign.failed_servers} failed</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {campaign.status === 'scheduled' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => updateCampaignStatus(campaign.id, 'running')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {campaign.status === 'running' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => updateCampaignStatus(campaign.id, 'cancelled')}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}

                      {['draft', 'scheduled'].includes(campaign.status) && (
                        <>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteCampaign(campaign.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}