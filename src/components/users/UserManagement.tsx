import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Edit, 
  Trash2, 
  Eye,
  Settings,
  Crown,
  Wrench
} from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
  createdAt: string;
  adGroup?: string;
}

export function UserManagement() {
  const { toast } = useToast();
  
  // Mock user data - in real implementation, this would come from Supabase
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      username: 'john.admin',
      email: 'john.admin@company.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-01T09:00:00Z',
      adGroup: 'IDrac-Admins'
    },
    {
      id: '2',
      username: 'sarah.operator',
      email: 'sarah.operator@company.com',
      role: 'operator',
      status: 'active',
      lastLogin: '2024-01-15T08:15:00Z',
      createdAt: '2024-01-03T14:20:00Z',
      adGroup: 'IDrac-Operators'
    },
    {
      id: '3',
      username: 'mike.viewer',
      email: 'mike.viewer@company.com',
      role: 'viewer',
      status: 'active',
      lastLogin: '2024-01-14T16:45:00Z',
      createdAt: '2024-01-05T11:10:00Z',
      adGroup: 'IDrac-Viewers'
    },
    {
      id: '4',
      username: 'temp.user',
      email: 'temp.user@company.com',
      role: 'viewer',
      status: 'pending',
      createdAt: '2024-01-15T12:00:00Z',
      adGroup: 'IDrac-Viewers'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'viewer' as const,
    adGroup: ''
  });

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-warning" />;
      case 'operator': return <Wrench className="w-4 h-4 text-primary" />;
      case 'viewer': return <Eye className="w-4 h-4 text-muted-foreground" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="status-offline">Admin</Badge>;
      case 'operator': return <Badge className="status-updating">Operator</Badge>;
      case 'viewer': return <Badge className="status-warning">Viewer</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="status-online">Active</Badge>;
      case 'inactive': return <Badge variant="outline">Inactive</Badge>;
      case 'pending': return <Badge className="status-warning">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in username and email",
        variant: "destructive",
      });
      return;
    }

    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      status: 'pending',
      createdAt: new Date().toISOString(),
      adGroup: newUser.adGroup
    };

    setUsers(prev => [...prev, user]);
    setNewUser({ username: '', email: '', role: 'viewer', adGroup: '' });
    
    toast({
      title: "User Created",
      description: `User ${newUser.username} has been created successfully`,
    });
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({
      title: "User Deleted",
      description: "User has been removed from the system",
    });
  };

  const rolePermissions = {
    admin: [
      'Full system access',
      'User management',
      'System configuration',
      'Firmware management',
      'Job scheduling',
      'Health monitoring'
    ],
    operator: [
      'Server management',
      'Firmware deployment',
      'Job scheduling',
      'Health monitoring',
      'View system status'
    ],
    viewer: [
      'View servers',
      'View job status',
      'View health status',
      'Read-only access'
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage user accounts and role-based access control</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="enterprise">
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="john.doe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@company.com"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value: any) => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="adGroup">AD Group (optional)</Label>
                <Input
                  id="adGroup"
                  value={newUser.adGroup}
                  onChange={(e) => setNewUser(prev => ({ ...prev, adGroup: e.target.value }))}
                  placeholder="IDrac-Operators"
                />
              </div>
              <Button onClick={handleCreateUser} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <h3 className="text-2xl font-bold">{users.length}</h3>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <h3 className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</h3>
              </div>
              <Shield className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <h3 className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</h3>
              </div>
              <Crown className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <h3 className="text-2xl font-bold">{users.filter(u => u.status === 'pending').length}</h3>
              </div>
              <Settings className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2">
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users ({filteredUsers.length})
              </CardTitle>
              <div className="flex gap-4">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <span className="font-medium">{user.username}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.adGroup && (
                            <p className="text-xs text-muted-foreground">AD: {user.adGroup}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Role Permissions */}
        <div>
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(rolePermissions).map(([role, permissions]) => (
                <div key={role} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(role)}
                    <span className="font-semibold capitalize">{role}</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    {permissions.map((permission, index) => (
                      <li key={index}>• {permission}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}