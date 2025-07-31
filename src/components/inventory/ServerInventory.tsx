import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, RefreshCw } from "lucide-react";

export function ServerInventory() {
  const servers = [
    {
      id: "1",
      hostname: "ESXi-PROD-01",
      ipAddress: "192.168.1.101",
      model: "PowerEdge R750",
      idracVersion: "6.10.30.00",
      biosVersion: "2.18.0",
      status: "online",
      lastUpdate: "2024-01-15",
      vCenter: "vcenter-prod.domain.com"
    },
    {
      id: "2", 
      hostname: "ESXi-PROD-02",
      ipAddress: "192.168.1.102",
      model: "PowerEdge R640",
      idracVersion: "6.08.30.00",
      biosVersion: "2.17.0",
      status: "updating",
      lastUpdate: "2024-01-20",
      vCenter: "vcenter-prod.domain.com"
    },
    {
      id: "3",
      hostname: "ESXi-DEV-01", 
      ipAddress: "192.168.2.101",
      model: "PowerEdge R550",
      idracVersion: "6.09.30.00",
      biosVersion: "2.16.1",
      status: "offline",
      lastUpdate: "2024-01-10",
      vCenter: "vcenter-dev.domain.com"
    },
    {
      id: "4",
      hostname: "ESXi-PROD-03",
      ipAddress: "192.168.1.103", 
      model: "PowerEdge R750xs",
      idracVersion: "6.10.30.00",
      biosVersion: "2.18.0",
      status: "online",
      lastUpdate: "2024-01-18",
      vCenter: "vcenter-prod.domain.com"
    },
    {
      id: "5",
      hostname: "SQL-PROD-01",
      ipAddress: "192.168.1.201",
      model: "PowerEdge R7525",
      idracVersion: "6.10.25.00",
      biosVersion: "2.17.2", 
      status: "warning",
      lastUpdate: "2024-01-12",
      vCenter: "vcenter-prod.domain.com"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online": return <Badge className="status-online">Online</Badge>;
      case "offline": return <Badge className="status-offline">Offline</Badge>; 
      case "updating": return <Badge className="status-updating">Updating</Badge>;
      case "warning": return <Badge className="status-warning">Warning</Badge>;
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
          <Button variant="enterprise">
            <RefreshCw className="w-4 h-4 mr-2" />
            Discover
          </Button>
        </div>
      </div>

      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle>Discovered Servers</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search servers..." 
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>iDRAC Version</TableHead>
                <TableHead>BIOS Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>vCenter</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.hostname}</TableCell>
                  <TableCell>{server.ipAddress}</TableCell>
                  <TableCell>{server.model}</TableCell>
                  <TableCell>{server.idracVersion}</TableCell>
                  <TableCell>{server.biosVersion}</TableCell>
                  <TableCell>{getStatusBadge(server.status)}</TableCell>
                  <TableCell className="text-muted-foreground">{server.vCenter}</TableCell>
                  <TableCell>{server.lastUpdate}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        Update
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
  );
}