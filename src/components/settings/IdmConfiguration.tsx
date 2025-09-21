import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, Users, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [realmValidation, setRealmValidation] = useState<string>('');
  const { toast } = useToast();

  // Debug logging for component initialization
  useEffect(() => {
    console.log('IdmConfiguration component mounted');
    return () => console.log('IdmConfiguration component unmounted');
  }, []);

  // Validate IDM realm format
  const validateRealm = (realm: string): string => {
    if (!realm) return '';
    
    // Check for basic domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!domainRegex.test(realm)) {
      return 'Invalid domain format. Use format like: idm.company.local';
    }
    
    if (realm.length > 253) {
      return 'Domain name too long (max 253 characters)';
    }
    
    return '';
  };

  // Validate realm on change
  useEffect(() => {
    const validation = validateRealm(formData.realm);
    setRealmValidation(validation);
  }, [formData.realm]);

  const handleDiscover = async () => {
    console.log('Starting IDM discovery process');
    
    // Validate inputs
    if (!formData.realm || !formData.adminUser || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Check realm validation
    if (realmValidation) {
      toast({
        title: "Invalid Realm Format",
        description: realmValidation,
        variant: "destructive",
      });
      return;
    }

    setIsDiscovering(true);
    try {
      console.log(`Discovering IDM groups for realm: ${formData.realm}`);
      
      const { data, error } = await supabase.functions.invoke('discover-redhat-idm', {
        body: {
          realm: formData.realm,
          adminUser: formData.adminUser,
          password: formData.password
        }
      });

      console.log('IDM discovery response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success) {
        const groups = data.groups || [];
        console.log(`Successfully discovered ${groups.length} groups`);
        setDiscoveredGroups(groups);
        setDiscoveryComplete(true);
        toast({
          title: "Discovery Complete",
          description: `Found ${groups.length} groups in ${formData.realm}`,
        });
      } else {
        const errorMsg = data?.error || 'Discovery failed';
        console.error('IDM discovery failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('IDM discovery error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to discover IDM configuration";
      toast({
        title: "Discovery Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConfigure = async () => {
    console.log('Starting IDM configuration process');
    console.log('Selected groups:', selectedGroups);
    console.log('Default role:', defaultRole);
    
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

      console.log('IDM configuration response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success) {
        console.log('IDM configuration completed successfully');
        toast({
          title: "Configuration Complete",
          description: "Red Hat IDM has been configured successfully",
        });
        // Reset form
        setFormData({ realm: '', adminUser: '', password: '' });
        setDiscoveredGroups([]);
        setSelectedGroups([]);
        setDiscoveryComplete(false);
        setRealmValidation('');
      } else {
        const errorMsg = data?.error || 'Configuration failed';
        console.error('IDM configuration failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('IDM configuration error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to configure IDM";
      toast({
        title: "Configuration Failed",
        description: errorMessage,
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
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure Red Hat IDM/FreeIPA integration to enable LDAP-based authentication for your organization.
        </AlertDescription>
      </Alert>
      
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
                className={realmValidation ? "border-destructive" : ""}
              />
              {realmValidation && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {realmValidation}
                </div>
              )}
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