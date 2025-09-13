import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCredentialProfiles } from '@/hooks/useCredentialProfiles';
import { useDatacenterScopes } from '@/hooks/useDatacenterScopes';
import { 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Server, 
  Network,
  Shield,
  Settings,
  Globe,
  MapPin
} from "lucide-react";

export function CredentialManagement() {
  const { 
    profiles, 
    assignments, 
    overrides, 
    loading,
    createProfile,
    updateProfile,
    deleteProfile,
    createAssignment,
    deleteAssignment,
    createHostOverride,
    deleteHostOverride
  } = useCredentialProfiles();

  const { datacenters } = useDatacenterScopes();

  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showCreateOverride, setShowCreateOverride] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    username: 'root',
    password_encrypted: 'calvin',
    port: 443,
    protocol: 'https' as 'https' | 'http',
    is_default: false,
    priority_order: 100
  });

  const [assignmentForm, setAssignmentForm] = useState({
    credential_profile_id: '',
    datacenter_id: '',
    ip_range_cidr: '',
    ip_range_start: '',
    ip_range_end: '',
    priority_order: 100,
    is_active: true
  });

  const [overrideForm, setOverrideForm] = useState({
    ip_address: '',
    credential_profile_id: ''
  });

  const handleCreateProfile = async () => {
    try {
      await createProfile(profileForm);
      setShowCreateProfile(false);
      setProfileForm({
        name: '',
        description: '',
        username: 'root',
        password_encrypted: 'calvin',
        port: 443,
        protocol: 'https',
        is_default: false,
        priority_order: 100
      });
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  const handleCreateAssignment = async () => {
    try {
      const assignmentData = {
        ...assignmentForm,
        datacenter_id: assignmentForm.datacenter_id || null,
        ip_range_cidr: assignmentForm.ip_range_cidr || null,
        ip_range_start: assignmentForm.ip_range_start || null,
        ip_range_end: assignmentForm.ip_range_end || null
      };
      
      await createAssignment(assignmentData);
      setShowCreateAssignment(false);
      setAssignmentForm({
        credential_profile_id: '',
        datacenter_id: '',
        ip_range_cidr: '',
        ip_range_start: '',
        ip_range_end: '',
        priority_order: 100,
        is_active: true
      });
    } catch (error) {
      console.error('Failed to create assignment:', error);
    }
  };

  const handleCreateOverride = async () => {
    try {
      await createHostOverride(overrideForm);
      setShowCreateOverride(false);
      setOverrideForm({
        ip_address: '',
        credential_profile_id: ''
      });
    } catch (error) {
      console.error('Failed to create override:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading credential profiles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Credential Management</h1>
            <p className="text-muted-foreground text-lg">
              Manage iDRAC credentials with IP range assignments and fallback mechanisms
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profiles">Credential Profiles</TabsTrigger>
          <TabsTrigger value="assignments">IP Range Assignments</TabsTrigger>
          <TabsTrigger value="overrides">Host Overrides</TabsTrigger>
        </TabsList>

        {/* Credential Profiles Tab */}
        <TabsContent value="profiles" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Create reusable credential profiles for different environments
            </p>
            <Dialog open={showCreateProfile} onOpenChange={setShowCreateProfile}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Credential Profile</DialogTitle>
                  <DialogDescription>
                    Create a new credential profile for iDRAC access
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Profile Name</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Production Credentials"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={profileForm.description}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Credentials for production environment"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={profileForm.password_encrypted}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, password_encrypted: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="protocol">Protocol</Label>
                      <Select
                        value={profileForm.protocol}
                        onValueChange={(value) => setProfileForm(prev => ({ ...prev, protocol: value as 'https' | 'http' }))}
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
                    <div>
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={profileForm.port}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_default"
                      checked={profileForm.is_default}
                      onCheckedChange={(checked) => setProfileForm(prev => ({ ...prev, is_default: !!checked }))}
                    />
                    <Label htmlFor="is_default">Set as default profile</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateProfile(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProfile}>Create Profile</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card key={profile.id} className="card-enterprise">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      {profile.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      {profile.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteProfile(profile.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {profile.description && (
                    <CardDescription className="text-xs">{profile.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="font-mono">{profile.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protocol:</span>
                      <span className="font-mono">{profile.protocol}:{profile.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <span>{profile.priority_order}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* IP Range Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Assign credential profiles to specific IP ranges or datacenters
            </p>
            <Dialog open={showCreateAssignment} onOpenChange={setShowCreateAssignment}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Assignment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create IP Range Assignment</DialogTitle>
                  <DialogDescription>
                    Assign a credential profile to an IP range or datacenter
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="credential_profile">Credential Profile</Label>
                    <Select
                      value={assignmentForm.credential_profile_id}
                      onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, credential_profile_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select credential profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name} ({profile.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="datacenter">Datacenter (Optional)</Label>
                    <Select
                      value={assignmentForm.datacenter_id}
                      onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, datacenter_id: value === "custom" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select datacenter or use custom IP range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom IP Range</SelectItem>
                        {datacenters.map((dc) => (
                          <SelectItem key={dc.id} value={dc.id}>
                            {dc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ip_range_cidr">IP Range (CIDR)</Label>
                    <Input
                      id="ip_range_cidr"
                      value={assignmentForm.ip_range_cidr}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, ip_range_cidr: e.target.value }))}
                      placeholder="192.168.1.0/24"
                    />
                  </div>
                  <div className="text-center text-muted-foreground text-sm">OR</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ip_range_start">Start IP</Label>
                      <Input
                        id="ip_range_start"
                        value={assignmentForm.ip_range_start}
                        onChange={(e) => setAssignmentForm(prev => ({ ...prev, ip_range_start: e.target.value }))}
                        placeholder="192.168.1.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ip_range_end">End IP</Label>
                      <Input
                        id="ip_range_end"
                        value={assignmentForm.ip_range_end}
                        onChange={(e) => setAssignmentForm(prev => ({ ...prev, ip_range_end: e.target.value }))}
                        placeholder="192.168.1.254"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateAssignment(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAssignment}>Create Assignment</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="card-enterprise">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      {assignment.credential_profile?.name || 'Unknown Profile'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {!assignment.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteAssignment(assignment.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">IP Range:</span>
                      <div className="font-mono">
                        {assignment.ip_range_cidr || 
                         `${assignment.ip_range_start} - ${assignment.ip_range_end}`}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <div>{assignment.priority_order}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Host Overrides Tab */}
        <TabsContent value="overrides" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Override credentials for specific hosts when default assignments fail
            </p>
            <Dialog open={showCreateOverride} onOpenChange={setShowCreateOverride}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Override
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Host Override</DialogTitle>
                  <DialogDescription>
                    Assign specific credentials to a host IP address
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ip_address">IP Address</Label>
                    <Input
                      id="ip_address"
                      value={overrideForm.ip_address}
                      onChange={(e) => setOverrideForm(prev => ({ ...prev, ip_address: e.target.value }))}
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="credential_profile">Credential Profile</Label>
                    <Select
                      value={overrideForm.credential_profile_id}
                      onValueChange={(value) => setOverrideForm(prev => ({ ...prev, credential_profile_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select credential profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name} ({profile.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateOverride(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOverride}>Create Override</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overrides.map((override) => (
              <Card key={override.id} className="card-enterprise">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      {override.ip_address}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => deleteHostOverride(override.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Profile:</span>
                      <div className="font-medium">{override.credential_profile?.name}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Username:</span>
                      <div className="font-mono">{override.credential_profile?.username}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Cards */}
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            How Credential Resolution Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                <span className="font-medium">Host Overrides</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Check for specific credential overrides for the target IP address first (highest priority)
              </p>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                <span className="font-medium">IP Range Assignments</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Match IP address to configured IP ranges or datacenter scopes, try in priority order
              </p>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                <span className="font-medium">Default Credentials</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Fall back to default credential profile if no specific matches found (lowest priority)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}