import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, Users, CheckCircle } from "lucide-react";

interface IdmGroup {
  name: string;
  dn: string;
  description?: string;
}

export function IdmConfiguration() {
  const [formData, setFormData] = useState({
    realm: '',
    adminUser: '',
    password: ''
  });
  const [discoveredGroups, setDiscoveredGroups] = useState<IdmGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [defaultRole, setDefaultRole] = useState<string>('operator');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);
  const { toast } = useToast();

  const handleDiscover = async () => {
    if (!formData.realm || !formData.adminUser || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke('discover-redhat-idm', {
        body: {
          realm: formData.realm,
          adminUser: formData.adminUser,
          password: formData.password
        }
      });

      if (error) throw error;

      if (data.success) {
        setDiscoveredGroups(data.groups || []);
        setDiscoveryComplete(true);
        toast({
          title: "Discovery Complete",
          description: `Found ${data.groups?.length || 0} groups in ${formData.realm}`,
        });
      } else {
        throw new Error(data.error || 'Discovery failed');
      }
    } catch (error) {
      console.error('IDM discovery error:', error);
      toast({
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : "Failed to discover IDM configuration",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConfigure = async () => {
    setIsConfiguring(true);
    try {
      const { data, error } = await supabase.functions.invoke('configure-redhat-idm', {
        body: {
          realm: formData.realm,
          adminUser: formData.adminUser,
          password: formData.password,
          selectedGroups,
          defaultRole
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Configuration Complete",
          description: "Red Hat IDM has been configured successfully",
        });
        // Reset form
        setFormData({ realm: '', adminUser: '', password: '' });
        setDiscoveredGroups([]);
        setSelectedGroups([]);
        setDiscoveryComplete(false);
      } else {
        throw new Error(data.error || 'Configuration failed');
      }
    } catch (error) {
      console.error('IDM configuration error:', error);
      toast({
        title: "Configuration Failed",
        description: error instanceof Error ? error.message : "Failed to configure IDM",
        variant: "destructive",
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  const toggleGroupSelection = (groupDn: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupDn) 
        ? prev.filter(dn => dn !== groupDn)
        : [...prev, groupDn]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Red Hat IDM Configuration
          </CardTitle>
          <CardDescription>
            Automatically configure LDAP integration with Red Hat Identity Management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="realm">IDM Realm/Domain</Label>
              <Input
                id="realm"
                placeholder="idm.company.local"
                value={formData.realm}
                onChange={(e) => setFormData(prev => ({ ...prev, realm: e.target.value }))}
                disabled={discoveryComplete}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminUser">Admin Username</Label>
              <Input
                id="adminUser"
                placeholder="admin"
                value={formData.adminUser}
                onChange={(e) => setFormData(prev => ({ ...prev, adminUser: e.target.value }))}
                disabled={discoveryComplete}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                disabled={discoveryComplete}
              />
            </div>
          </div>
          
          {!discoveryComplete && (
            <Button 
              onClick={handleDiscover} 
              disabled={isDiscovering}
              className="w-full"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discovering IDM Configuration...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Discover & Configure
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {discoveryComplete && discoveredGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Groups to Import
            </CardTitle>
            <CardDescription>
              Choose which IDM groups should have access to this application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultRole">Default Role for IDM Users</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Available Groups ({discoveredGroups.length})</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                {discoveredGroups.map((group) => (
                  <div key={group.dn} className="flex items-center space-x-2">
                    <Checkbox
                      id={group.dn}
                      checked={selectedGroups.includes(group.dn)}
                      onCheckedChange={() => toggleGroupSelection(group.dn)}
                    />
                    <Label htmlFor={group.dn} className="flex-1 cursor-pointer">
                      <div className="font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-muted-foreground">{group.description}</div>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleConfigure} 
              disabled={isConfiguring || selectedGroups.length === 0}
              className="w-full"
            >
              {isConfiguring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configuring IDM Integration...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Configuration ({selectedGroups.length} groups)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {discoveryComplete && discoveredGroups.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No groups found in the IDM realm. Please check your credentials and try again.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}