import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  FileText,
  Plus,
  Copy,
  Trash2,
  Star,
  Folder,
  Calendar,
  User,
  TrendingUp
} from "lucide-react";

interface CampaignTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelect: (template: any) => void;
}

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  template_data: any;
  category: string;
  is_system_template: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

const TEMPLATE_CATEGORIES = [
  'general',
  'security',
  'maintenance',
  'emergency',
  'firmware',
  'bios'
];

export function CampaignTemplatesModal({ 
  open, 
  onOpenChange, 
  onTemplateSelect 
}: CampaignTemplatesModalProps) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'general',
    template_data: {
      update_type: 'firmware',
      components: ['BIOS', 'iDRAC'],
      rollout_strategy: 'sequential',
      priority: 'medium',
      safety_checks: {
        requires_approval: false,
        max_concurrent_updates: 3,
        health_checks_enabled: true
      }
    }
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign templates",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      const { error } = await supabase
        .from('campaign_templates')
        .insert({
          name: newTemplate.name,
          description: newTemplate.description,
          category: newTemplate.category,
          template_data: newTemplate.template_data
        });

      if (error) throw error;

      toast({
        title: "Template Created",
        description: "Campaign template has been saved successfully"
      });

      setIsCreating(false);
      setNewTemplate({
        name: '',
        description: '',
        category: 'general',
        template_data: {
          update_type: 'firmware',
          components: ['BIOS', 'iDRAC'],
          rollout_strategy: 'sequential',
          priority: 'medium',
          safety_checks: {
            requires_approval: false,
            max_concurrent_updates: 3,
            health_checks_enabled: true
          }
        }
      });
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign template",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: "Campaign template has been removed"
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign template",
        variant: "destructive"
      });
    }
  };

  const duplicateTemplate = async (template: CampaignTemplate) => {
    try {
      const { error } = await supabase
        .from('campaign_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          template_data: template.template_data
        });

      if (error) throw error;

      toast({
        title: "Template Duplicated",
        description: "Campaign template has been copied successfully"
      });

      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate campaign template",
        variant: "destructive"
      });
    }
  };

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return '🔒';
      case 'maintenance': return '🔧';
      case 'emergency': return '🚨';
      case 'firmware': return '💾';
      case 'bios': return '⚙️';
      default: return '📋';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Campaign Templates
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="browse" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Templates</TabsTrigger>
            <TabsTrigger value="create">Create Template</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            {/* Category Filter */}
            <div className="flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center gap-2">
                        <span>{getCategoryIcon(category)}</span>
                        <span className="capitalize">{category}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
              </div>
            </div>

            <ScrollArea className="h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(template.category)}</span>
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                              {template.is_system_template && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  System
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateTemplate(template);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {!template.is_system_template && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplate(template.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-3">
                        {template.description}
                      </p>
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>Created by {template.created_by}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(template.created_at), 'PPp')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3" />
                          <span>Used {template.usage_count} times</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-wrap gap-1">
                          {template.template_data.components?.slice(0, 3).map((component: string) => (
                            <Badge key={component} variant="secondary" className="text-xs">
                              {component}
                            </Badge>
                          ))}
                          {template.template_data.components?.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.template_data.components.length - 3}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            onTemplateSelect(template);
                            onOpenChange(false);
                          }}
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredTemplates.length === 0 && !isLoading && (
                <div className="text-center text-muted-foreground py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No templates found</h3>
                  <p>Create your first campaign template to get started</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Monthly BIOS Update"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={newTemplate.category} 
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            <div className="flex items-center gap-2">
                              <span>{getCategoryIcon(category)}</span>
                              <span className="capitalize">{category}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this template is used for..."
                    rows={3}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Template Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Update Type</Label>
                        <Select
                          value={newTemplate.template_data.update_type}
                          onValueChange={(value) => setNewTemplate(prev => ({
                            ...prev,
                            template_data: { ...prev.template_data, update_type: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="firmware">Firmware</SelectItem>
                            <SelectItem value="bios">BIOS</SelectItem>
                            <SelectItem value="idrac">iDRAC</SelectItem>
                            <SelectItem value="security_patch">Security Patch</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Rollout Strategy</Label>
                        <Select
                          value={newTemplate.template_data.rollout_strategy}
                          onValueChange={(value) => setNewTemplate(prev => ({
                            ...prev,
                            template_data: { ...prev.template_data, rollout_strategy: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sequential">Sequential</SelectItem>
                            <SelectItem value="parallel">Parallel</SelectItem>
                            <SelectItem value="canary">Canary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={newTemplate.template_data.priority}
                          onValueChange={(value) => setNewTemplate(prev => ({
                            ...prev,
                            template_data: { ...prev.template_data, priority: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Max Concurrent Updates</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={newTemplate.template_data.safety_checks.max_concurrent_updates}
                          onChange={(e) => setNewTemplate(prev => ({
                            ...prev,
                            template_data: {
                              ...prev.template_data,
                              safety_checks: {
                                ...prev.template_data.safety_checks,
                                max_concurrent_updates: parseInt(e.target.value) || 1
                              }
                            }
                          }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Components (comma-separated)</Label>
                      <Input
                        value={newTemplate.template_data.components.join(', ')}
                        onChange={(e) => setNewTemplate(prev => ({
                          ...prev,
                          template_data: {
                            ...prev.template_data,
                            components: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                          }
                        }))}
                        placeholder="e.g., BIOS, iDRAC, NIC"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTemplate} disabled={!newTemplate.name}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}