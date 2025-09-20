import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { useCredentialProfiles } from '@/hooks/useCredentialProfiles';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Key,
  Shield,
  Plus,
  TestTube,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  Trash2,
} from 'lucide-react';

interface CredentialSectionProps {
  selectedCredentialId?: string;
  onCredentialSelect: (credentialId: string | undefined) => void;
  useQuickCredentials?: boolean;
  onQuickCredentialsChange: (use: boolean) => void;
  quickCredentials?: {
    username: string;
    password: string;
  };
  onQuickCredentialsUpdate: (credentials: { username: string; password: string }) => void;
  ipRange?: string;
}

export function CredentialSection({
  selectedCredentialId,
  onCredentialSelect,
  useQuickCredentials = false,
  onQuickCredentialsChange,
  quickCredentials = { username: '', password: '' },
  onQuickCredentialsUpdate,
  ipRange,
}: CredentialSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingCredentials, setTestingCredentials] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [newProfile, setNewProfile] = useState({
    name: '',
    username: '',
    password: '',
    description: '',
    port: 443,
    protocol: 'https' as 'https' | 'http',
    is_default: false,
  });

  const { profiles, loading, createProfile, deleteProfile, refreshData } = useCredentialProfiles();
  const { toast } = useToast();

  useEffect(() => {
    // Auto-select default profile if none selected
    if (!selectedCredentialId && !useQuickCredentials && profiles.length > 0) {
      const defaultProfile = profiles.find(p => p.is_default);
      if (defaultProfile) {
        onCredentialSelect(defaultProfile.id);
      }
    }
  }, [profiles, selectedCredentialId, useQuickCredentials, onCredentialSelect]);

  const handleCreateProfile = async () => {
    try {
      // Encrypt password before saving
      const { data, error } = await supabase.rpc('encrypt_credential_password', {
        plain_password: newProfile.password
      });

      if (error) throw error;

      await createProfile({
        name: newProfile.name,
        username: newProfile.username,
        password_encrypted: data,
        description: newProfile.description,
        port: newProfile.port,
        protocol: newProfile.protocol,
        is_default: newProfile.is_default,
        priority_order: profiles.length + 1,
      });

      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error",
        description: "Failed to create credential profile",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setNewProfile({
      name: '',
      username: '',
      password: '',
      description: '',
      port: 443,
      protocol: 'https',
      is_default: false,
    });
  };

  const testCredentials = async (profileId: string) => {
    if (!ipRange) {
      toast({
        title: "Test Failed",
        description: "Please enter an IP range first to test credentials",
        variant: "destructive",
      });
      return;
    }

    setTestingCredentials(prev => ({ ...prev, [profileId]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('test-credentials', {
        body: {
          credentialProfileId: profileId,
          targetIp: ipRange.split('-')[0] // Use first IP for testing
        }
      });

      if (error) throw error;

      setTestResults(prev => ({ ...prev, [profileId]: data }));
      
      toast({
        title: data.success ? "Test Successful" : "Test Failed",
        description: data.message || (data.success ? 
          `Connected successfully via ${data.protocol}` : 
          "Failed to connect with these credentials"
        ),
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Credential test error:', error);
      toast({
        title: "Test Failed",
        description: "Unable to test credentials",
        variant: "destructive",
      });
    } finally {
      setTestingCredentials(prev => ({ ...prev, [profileId]: false }));
    }
  };

  const togglePasswordVisibility = (profileId: string) => {
    setShowPasswords(prev => ({ ...prev, [profileId]: !prev[profileId] }));
  };

  const getCredentialStatus = (profileId: string) => {
    if (testingCredentials[profileId]) {
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Testing</Badge>;
    }
    
    const result = testResults[profileId];
    if (result) {
      return result.success ? 
        <Badge className="bg-success/10 text-success border-success/20">
          <CheckCircle className="w-3 h-3 mr-1" />Verified
        </Badge> :
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />Failed
        </Badge>;
    }
    
    return null;
  };

  const selectedProfile = profiles.find(p => p.id === selectedCredentialId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Credentials
          </CardTitle>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {isExpanded ? 'Collapse' : 'Manage'}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Selection */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="use-quick"
              checked={useQuickCredentials}
              onCheckedChange={onQuickCredentialsChange}
            />
            <Label htmlFor="use-quick">Use quick credentials (not saved)</Label>
          </div>

          {!useQuickCredentials && (
            <div className="space-y-2">
              <Label>Credential Profile</Label>
              <Select value={selectedCredentialId || ''} onValueChange={onCredentialSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select credential profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        {profile.name}
                        {profile.is_default && <Shield className="w-3 h-3" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedProfile && (
                <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{selectedProfile.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedProfile.username}@{selectedProfile.protocol}:{selectedProfile.port}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getCredentialStatus(selectedProfile.id)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testCredentials(selectedProfile.id)}
                        disabled={testingCredentials[selectedProfile.id] || !ipRange}
                      >
                        <TestTube className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {useQuickCredentials && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={quickCredentials.username}
                  onChange={(e) => onQuickCredentialsUpdate({
                    ...quickCredentials,
                    username: e.target.value
                  })}
                  placeholder="root"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.quick ? 'text' : 'password'}
                    value={quickCredentials.password}
                    onChange={(e) => onQuickCredentialsUpdate({
                      ...quickCredentials,
                      password: e.target.value
                    })}
                    placeholder="Enter password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => togglePasswordVisibility('quick')}
                  >
                    {showPasswords.quick ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expanded Management */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Credential Profiles</h4>
                <p className="text-sm text-muted-foreground">
                  Manage saved credentials for server access
                </p>
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Credential Profile</DialogTitle>
                    <DialogDescription>
                      Create a new credential profile for server authentication
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Profile Name</Label>
                        <Input
                          value={newProfile.name}
                          onChange={(e) => setNewProfile(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Dell Default"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input
                          value={newProfile.username}
                          onChange={(e) => setNewProfile(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="root"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={newProfile.password}
                        onChange={(e) => setNewProfile(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter password"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Protocol</Label>
                        <Select
                          value={newProfile.protocol}
                          onValueChange={(value: 'https' | 'http') => 
                            setNewProfile(prev => ({ ...prev, protocol: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="https">HTTPS</SelectItem>
                            <SelectItem value="http">HTTP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input
                          type="number"
                          value={newProfile.port}
                          onChange={(e) => setNewProfile(prev => ({ ...prev, port: parseInt(e.target.value) || 443 }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newProfile.description}
                        onChange={(e) => setNewProfile(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="When to use these credentials..."
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newProfile.is_default}
                        onCheckedChange={(checked) => setNewProfile(prev => ({ ...prev, is_default: checked }))}
                      />
                      <Label>Set as default profile</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProfile}>
                      Create Profile
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Profile List */}
            <div className="space-y-2">
              {profiles.map(profile => (
                <Card key={profile.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{profile.name}</span>
                          {profile.is_default && <Shield className="w-3 h-3 text-primary" />}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {profile.username} • {profile.protocol}:{profile.port}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getCredentialStatus(profile.id)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testCredentials(profile.id)}
                        disabled={testingCredentials[profile.id]}
                      >
                        <TestTube className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProfile(profile.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}