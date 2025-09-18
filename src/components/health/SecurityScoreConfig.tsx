import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Settings,
  Info,
  Save,
  RotateCcw,
  AlertTriangle
} from "lucide-react";

interface HealthScoringConfig {
  id: string;
  category: string;
  metric_name: string;
  weight: number;
  enabled: boolean;
  thresholds: any;
  description: string;
}

export default function SecurityScoreConfig() {
  const [configs, setConfigs] = useState<HealthScoringConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('health_scoring_config')
        .select('*')
        .order('category', { ascending: true })
        .order('weight', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching scoring configs:', error);
      toast({
        title: "Error",
        description: "Failed to load health scoring configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (id: string, updates: Partial<HealthScoringConfig>) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('health_scoring_config')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setConfigs(prev => prev.map(config => 
        config.id === id ? { ...config, ...updates } : config
      ));

      toast({
        title: "Configuration Updated",
        description: "Health scoring configuration has been saved"
      });
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      
      // Delete existing configs and re-insert defaults
      const { error: deleteError } = await supabase
        .from('health_scoring_config')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Re-insert default configurations
      const defaultConfigs = [
        { category: 'security', metric_name: 'critical_vulnerabilities', weight: 25, thresholds: { critical: 0, warning: 3 }, description: 'Critical security vulnerabilities detected' },
        { category: 'security', metric_name: 'warranty_expiration', weight: 15, thresholds: { critical: 30, warning: 90 }, description: 'Server warranties expiring (days)' },
        { category: 'security', metric_name: 'os_eol_status', weight: 20, thresholds: { critical: 30, warning: 180 }, description: 'Operating system end-of-life (days)' },
        { category: 'security', metric_name: 'credential_strength', weight: 10, thresholds: { min_score: 60 }, description: 'Credential complexity and rotation status' },
        { category: 'connectivity', metric_name: 'server_reachability', weight: 20, thresholds: { success_rate: 95 }, description: 'Server connectivity success rate' },
        { category: 'connectivity', metric_name: 'vcenter_integration', weight: 15, thresholds: { success_rate: 98 }, description: 'VMware vCenter integration health' },
        { category: 'connectivity', metric_name: 'response_time', weight: 10, thresholds: { critical_ms: 5000, warning_ms: 2000 }, description: 'Average server response time' },
        { category: 'compliance', metric_name: 'firmware_compliance', weight: 20, thresholds: { compliance_rate: 90 }, description: 'Firmware version compliance rate' },
        { category: 'compliance', metric_name: 'backup_freshness', weight: 15, thresholds: { critical_hours: 168, warning_hours: 48 }, description: 'System backup freshness' },
        { category: 'compliance', metric_name: 'maintenance_windows', weight: 10, thresholds: { adherence_rate: 95 }, description: 'Maintenance window adherence' },
        { category: 'performance', metric_name: 'update_success_rate', weight: 15, thresholds: { success_rate: 95 }, description: 'Firmware update success rate' },
        { category: 'performance', metric_name: 'discovery_accuracy', weight: 10, thresholds: { accuracy_rate: 98 }, description: 'Server discovery accuracy rate' },
        { category: 'performance', metric_name: 'storage_utilization', weight: 10, thresholds: { critical_percent: 90, warning_percent: 75 }, description: 'Storage utilization percentage' }
      ];

      const { error: insertError } = await supabase
        .from('health_scoring_config')
        .insert(defaultConfigs);

      if (insertError) throw insertError;

      toast({
        title: "Configuration Reset",
        description: "Health scoring has been reset to default values"
      });

      // Refresh the data
      await fetchConfigs();
    } catch (error) {
      console.error('Error resetting configs:', error);
      toast({
        title: "Error",
        description: "Failed to reset configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'connectivity': return <Settings className="w-4 h-4" />;
      case 'compliance': return <AlertTriangle className="w-4 h-4" />;
      case 'performance': return <Settings className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'bg-red-500';
      case 'connectivity': return 'bg-blue-500';
      case 'compliance': return 'bg-yellow-500';
      case 'performance': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const categories = [...new Set(configs.map(c => c.category))];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Health Scoring Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">Loading configuration...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Health Scoring Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure how health scores are calculated. Total weight should approximately equal 100 for balanced scoring.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetToDefaults} disabled={isSaving}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue={categories[0]}>
        <TabsList className="grid w-full grid-cols-4">
          {categories.map(category => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category}>
            <div className="space-y-4">
              {configs
                .filter(config => config.category === category)
                .map(config => (
                  <Card key={config.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-lg ${getCategoryColor(config.category)} flex items-center justify-center text-white mt-1`}>
                          {getCategoryIcon(config.category)}
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold capitalize">
                                {config.metric_name.replace(/_/g, ' ')}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {config.description}
                              </p>
                            </div>
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={(enabled) => 
                                updateConfig(config.id, { enabled })
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor={`weight-${config.id}`}>
                                Weight ({config.weight})
                              </Label>
                              <Input
                                id={`weight-${config.id}`}
                                type="number"
                                min="0"
                                max="50"
                                value={config.weight}
                                onChange={(e) => 
                                  updateConfig(config.id, { weight: parseInt(e.target.value) || 0 })
                                }
                                disabled={!config.enabled}
                              />
                            </div>

                            {/* Thresholds based on metric type */}
                            {config.thresholds.critical !== undefined && (
                              <div>
                                <Label>Critical Threshold</Label>
                                <Input
                                  type="number"
                                  value={config.thresholds.critical}
                                  onChange={(e) => {
                                    const newThresholds = {
                                      ...config.thresholds,
                                      critical: parseInt(e.target.value) || 0
                                    };
                                    updateConfig(config.id, { thresholds: newThresholds });
                                  }}
                                  disabled={!config.enabled}
                                />
                              </div>
                            )}

                            {config.thresholds.warning !== undefined && (
                              <div>
                                <Label>Warning Threshold</Label>
                                <Input
                                  type="number"
                                  value={config.thresholds.warning}
                                  onChange={(e) => {
                                    const newThresholds = {
                                      ...config.thresholds,
                                      warning: parseInt(e.target.value) || 0
                                    };
                                    updateConfig(config.id, { thresholds: newThresholds });
                                  }}
                                  disabled={!config.enabled}
                                />
                              </div>
                            )}

                            {config.thresholds.success_rate !== undefined && (
                              <div>
                                <Label>Success Rate (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={config.thresholds.success_rate}
                                  onChange={(e) => {
                                    const newThresholds = {
                                      ...config.thresholds,
                                      success_rate: parseInt(e.target.value) || 0
                                    };
                                    updateConfig(config.id, { thresholds: newThresholds });
                                  }}
                                  disabled={!config.enabled}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Current Weight Distribution</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {categories.map(category => {
              const categoryConfigs = configs.filter(c => c.category === category && c.enabled);
              const totalWeight = categoryConfigs.reduce((sum, c) => sum + c.weight, 0);
              return (
                <div key={category} className="text-center">
                  <div className="font-semibold capitalize">{category}</div>
                  <div className={`text-lg ${totalWeight > 30 ? 'text-warning' : 'text-success'}`}>
                    {totalWeight}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <div className="text-sm text-muted-foreground">
              Total Weight: <span className="font-semibold">
                {configs.filter(c => c.enabled).reduce((sum, c) => sum + c.weight, 0)}
              </span> (recommended: ~100)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}