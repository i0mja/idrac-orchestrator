import React, { useState } from 'react';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, Users, Server, Settings, UserPlus, Mail, 
  Shield, Crown, User, Edit, Trash2, CheckCircle
} from 'lucide-react';

export function OrganizationManagement() {
  const {
    organization,
    members, 
    loading,
    isAdmin,
    updateOrganization,
    inviteMember,
    updateMemberRole,
    removeMember,
    getUsageStats
  } = useMultiTenant();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [orgUpdates, setOrgUpdates] = useState({
    name: organization?.name || '',
    domain: organization?.domain || '',
    subscription_tier: organization?.subscription_tier || 'enterprise'
  });

  const usageStats = getUsageStats();

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    await inviteMember(inviteEmail, inviteRole);
    setInviteEmail('');
    setInviteRole('member');
    setIsInviteOpen(false);
  };

  const handleUpdateOrganization = async () => {
    await updateOrganization(orgUpdates);
    setIsEditingOrg(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center space-y-4 py-12">
        <Building2 className="w-16 h-16 text-muted-foreground mx-auto" />
        <h2 className="text-2xl font-bold">No Organization Found</h2>
        <p className="text-muted-foreground">You don't belong to any organization yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gradient">Organization Management</h1>
            <p className="text-muted-foreground text-lg">
              Manage your organization settings and team members
            </p>
          </div>
        </div>

        {isAdmin && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="team@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteMember}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Usage Stats */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-enterprise">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usageStats.users.current} / {usageStats.users.max}
              </div>
              <Progress value={usageStats.users.percentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {usageStats.users.percentage}% of limit used
              </p>
            </CardContent>
          </Card>

          <Card className="card-enterprise">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Servers</CardTitle>
              <Server className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usageStats.servers.current} / {usageStats.servers.max}
              </div>
              <Progress value={usageStats.servers.percentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {usageStats.servers.percentage}% of limit used
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Organization Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{organization.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Domain:</span>
                      <span className="font-medium">{organization.domain || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subscription:</span>
                      <Badge variant="default">{organization.subscription_tier}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={organization.is_active ? 'default' : 'destructive'}>
                        {organization.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Quick Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Members:</span>
                      <span className="font-medium">{members.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Members:</span>
                      <span className="font-medium">{members.filter(m => m.is_active).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Admins:</span>
                      <span className="font-medium">
                        {members.filter(m => m.role === 'admin' || m.role === 'owner').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">User {member.user_id.slice(-8)}</h4>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role)}
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {member.is_active ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-warning" />
                        )}
                        <span className="text-sm">
                          {member.is_active ? 'Active' : 'Pending'}
                        </span>
                      </div>

                      {isAdmin && member.role !== 'owner' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeMember(member.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {members.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
                    <p className="text-muted-foreground">
                      Invite team members to collaborate on your organization.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Organization Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        value={orgUpdates.name}
                        onChange={(e) => setOrgUpdates(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditingOrg}
                      />
                    </div>
                    <div>
                      <Label htmlFor="orgDomain">Domain</Label>
                      <Input
                        id="orgDomain"
                        value={orgUpdates.domain}
                        onChange={(e) => setOrgUpdates(prev => ({ ...prev, domain: e.target.value }))}
                        placeholder="example.com"
                        disabled={!isEditingOrg}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier">Subscription Tier</Label>
                      <Input
                        id="tier"
                        value={orgUpdates.subscription_tier}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isEditingOrg ? (
                      <Button onClick={() => setIsEditingOrg(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Settings
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handleUpdateOrganization}>
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingOrg(false);
                            setOrgUpdates({
                              name: organization?.name || '',
                              domain: organization?.domain || '',
                              subscription_tier: organization?.subscription_tier || 'enterprise'
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                  <p className="text-muted-foreground">
                    Only organization administrators can modify settings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}