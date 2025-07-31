import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useServers } from "@/hooks/useServers";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  Download, 
  Zap, 
  Eye,
  RefreshCw,
  Plus
} from "lucide-react";

export function ServerInventory() {
  const { servers, loading, discoverServers } = useServers();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryForm, setDiscoveryForm] = useState({
    ipRange: "",
    username: "",
    password: ""
  });
  const { toast } = useToast();

  const filteredServers = servers.filter(server =>
    server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(server.ip_address).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (server.model || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDiscover = async () => {
    if (!discoveryForm.ipRange || !discoveryForm.username || !discoveryForm.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all discovery fields",
        variant: "destructive",
      });
      return;
    }

    setIsDiscovering(true);
    try {
      await discoverServers(discoveryForm.ipRange, {
        username: discoveryForm.username,
        password: discoveryForm.password
      });
      setDiscoveryForm({ ipRange: "", username: "", password: "" });
    } finally {
      setIsDiscovering(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online": return <Badge className="status-online">Online</Badge>;
      case "updating": return <Badge className="status-updating">Updating</Badge>;
      case "offline": return <Badge className="status-offline">Offline</Badge>;
      case "error": return <Badge className="status-offline">Error</Badge>;
      case "unknown": return <Badge className="status-warning">Unknown</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Server Inventory</h2>
          <p className="text-muted-foreground">Manage Dell iDRAC endpoints discovered via Redfish and vCenter</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="enterprise">
                <Zap className="w-4 h-4 mr-2" />
                Discover
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Discover Servers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ipRange">IP Range (e.g., 192.168.1.1-50)</Label>
                  <Input
                    id="ipRange"
                    value={discoveryForm.ipRange}
                    onChange={(e) => setDiscoveryForm(prev => ({ ...prev, ipRange: e.target.value }))}
                    placeholder="192.168.1.1-50"
                  />
                </div>
                <div>
                  <Label htmlFor="username">iDRAC Username</Label>
                  <Input
                    id="username"
                    value={discoveryForm.username}
                    onChange={(e) => setDiscoveryForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="root"
                  />
                </div>
                <div>
                  <Label htmlFor="password">iDRAC Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={discoveryForm.password}
                    onChange={(e) => setDiscoveryForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="password"
                  />
                </div>
                <Button onClick={handleDiscover} disabled={isDiscovering} className="w-full">
                  {isDiscovering ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Start Discovery
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Discovered Servers ({filteredServers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search servers..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading servers...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>iDRAC Version</TableHead>
                  <TableHead>BIOS Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.hostname}</TableCell>
                    <TableCell>{String(server.ip_address)}</TableCell>
                    <TableCell>{server.model || "Unknown"}</TableCell>
                    <TableCell>{server.idrac_version || "Unknown"}</TableCell>
                    <TableCell>{server.bios_version || "Unknown"}</TableCell>
                    <TableCell>{getStatusBadge(server.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{server.environment}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Update
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredServers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No servers found. Use the Discover button to find servers.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}