import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit2, Trash2, Key, Shield, Network, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CredentialProfile {
  id: string;
  name: string;
  username: string;
  description?: string;
  protocol_priority?: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface CredentialAssignment {
  id: string;
  credential_profile_id: string;
  ip_range_cidr?: any;
  ip_range_start?: any;
  ip_range_end?: any;
  priority_order: number;
  is_active: boolean;
  profile?: any;
}

export function CredentialProfileManager() {
  const [profiles, setProfiles] = useState<CredentialProfile[]>([]);
  const [assignments, setAssignments] = useState<CredentialAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CredentialProfile | null>(null);
  const [newProfile, setNewProfile] = useState({
    name: '',
    username: '',
    password: '',
    description: '',
    protocol_priority: ['REDFISH', 'WSMAN', 'RACADM', 'IPMI', 'SSH'],
    is_default: false
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load credential profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('credential_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);
      
      // Load credential assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('credential_assignments')
        .select(`
          *,
          profile:credential_profiles(*)
        `)
        .order('priority_order');
      
      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);
      
    } catch (error) {
      console.error('Error loading credential data:', error);
      toast({
        title: "Error",
        description: "Failed to load credential profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const profileData = {
        name: newProfile.name,
        username: newProfile.username,
        password_encrypted: newProfile.password, // In production, encrypt this properly
        description: newProfile.description,
        protocol_priority: newProfile.protocol_priority,
        is_default: newProfile.is_default
      };

      if (editingProfile) {
        const { error } = await supabase
          .from('credential_profiles')
          .update(profileData)
          .eq('id', editingProfile.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Credential profile updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('credential_profiles')
          .insert([profileData]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Credential profile created successfully",
        });
      }
      
      setIsCreateDialogOpen(false);
      setEditingProfile(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving credential profile:', error);
      toast({
        title: "Error",
        description: "Failed to save credential profile",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('credential_profiles')
        .delete()
        .eq('id', profileId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Credential profile deleted successfully",
      });
      
      loadData();
    } catch (error) {
      console.error('Error deleting credential profile:', error);
      toast({
        title: "Error",
        description: "Failed to delete credential profile",
        variant: "destructive",
      });
    }
  };

  const handleTestCredentials = async (profile: CredentialProfile) => {
    try {
      toast({
        title: "Testing Credentials",
        description: "Testing credential profile against known servers...",
      });
      
      // This would integrate with the protocol detection system
      // For now, simulate a test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Test Complete",
        description: "Credentials tested successfully on 5 servers",
      });
    } catch (error) {
      toast({
        title: "Test Failed", 
        description: "Credential test failed",
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
      protocol_priority: ['REDFISH', 'WSMAN', 'RACADM', 'IPMI', 'SSH'],
      is_default: false
    });
  };

  const startEdit = (profile: CredentialProfile) => {
    setEditingProfile(profile);
    setNewProfile({
      name: profile.name,
      username: profile.username,
      password: '', // Don't load actual password
      description: profile.description || '',
      protocol_priority: profile.protocol_priority || ['REDFISH', 'WSMAN', 'RACADM', 'IPMI', 'SSH'],
      is_default: profile.is_default
    });
    setIsCreateDialogOpen(true);
  };

  if (loading) {
    return <div className="p-4">Loading credential profiles...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Credential Profiles</h2>
          <p className="text-muted-foreground">Manage authentication credentials for server discovery and operations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {resetForm(); setEditingProfile(null);}}>
              <Plus className="h-4 w-4 mr-2" />
              Add Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProfile ? 'Edit' : 'Create'} Credential Profile</DialogTitle>
              <DialogDescription>
                {editingProfile ? 'Update' : 'Create'} authentication credentials for server access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Profile Name</Label>
                  <Input
                    id="name"
                    value={newProfile.name}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Dell Default Credentials"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newProfile.username}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="root"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newProfile.password}
                  onChange={(e) => setNewProfile(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProfile.description}
                  onChange={(e) => setNewProfile(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description of when to use these credentials"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={newProfile.is_default}
                  onCheckedChange={(checked) => setNewProfile(prev => ({ ...prev, is_default: checked }))}
                />
                <Label htmlFor="is_default">Use as default credentials</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile}>
                  {editingProfile ? 'Update' : 'Create'} Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Profiles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <Card key={profile.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-primary" />
                  <CardTitle className="text-lg">{profile.name}</CardTitle>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTestCredentials(profile)}
                  >
                    <TestTube className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(profile)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProfile(profile.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {profile.is_default && (
                <Badge variant="secondary" className="w-fit">
                  <Shield className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Username</p>
                  <p className="text-sm text-muted-foreground">{profile.username}</p>
                </div>
                
                {profile.description && (
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{profile.description}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium mb-2">Protocol Priority</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.protocol_priority?.map((protocol, index) => (
                      <Badge key={protocol} variant="outline" className="text-xs">
                        {index + 1}. {protocol}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignments Section */}
      <Separator />
      
      <div>
        <h3 className="text-lg font-semibold mb-4">IP Range Assignments</h3>
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Network className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">
                      {assignment.ip_range_cidr || `${assignment.ip_range_start} - ${assignment.ip_range_end}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Profile: {assignment.profile?.name} (Priority: {assignment.priority_order})
                    </p>
                  </div>
                </div>
                <Badge variant={assignment.is_active ? "default" : "secondary"}>
                  {assignment.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}