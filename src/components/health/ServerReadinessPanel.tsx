import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  PlayCircle,
  Search,
  Eye,
  Filter,
  RefreshCw,
  Network,
  Lock,
  Package,
  Cloud
} from "lucide-react";

interface ReadinessCheck {
  server_id: string;
  hostname: string;
  ip_address: string;
  readiness: 'ready' | 'degraded' | 'not_ready';
  score: number;
  blocking_issues: number;
  warnings: number;
}

interface ServerReadinessDetail {
  id: string;
  server_id: string;
  connectivity_status: string;
  credential_status: string;
  firmware_capability_status: string;
  vcenter_integration_status: string | null;
  overall_readiness: string;
  readiness_score: number;
  blocking_issues: any;
  warnings: any;
  check_timestamp: string;
}

interface ServerReadinessPanelProps {
  readinessResults: ReadinessCheck[];
  onRunCheck: () => void;
  isRunning: boolean;
}

export default function ServerReadinessPanel({ 
  readinessResults, 
  onRunCheck, 
  isRunning 
}: ServerReadinessPanelProps) {
  const [servers, setServers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedServer, setSelectedServer] = useState<ServerReadinessDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const { toast } = useToast();

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('hostname');

      if (error) throw error;
      setServers(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const viewServerDetails = async (serverId: string) => {
    try {
      const { data, error } = await supabase
        .from('server_readiness_checks')
        .select('*')
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setSelectedServer(data[0]);
        setShowDetailDialog(true);
      } else {
        toast({
          title: "No Readiness Data",
          description: "No readiness check data found for this server. Run a check first.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching server details:', error);
      toast({
        title: "Error",
        description: "Failed to load server readiness details",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // Merge servers with readiness data
  const serversWithReadiness = servers.map(server => {
    const readinessData = readinessResults.find(r => r.server_id === server.id);
    return {
      ...server,
      readiness: readinessData?.readiness || 'unknown',
      score: readinessData?.score || 0,
      blocking_issues: readinessData?.blocking_issues || 0,
      warnings: readinessData?.warnings || 0
    };
  });

  // Filter servers
  const filteredServers = serversWithReadiness.filter(server => {
    const matchesSearch = server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.ip_address.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || server.readiness === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getReadinessIcon = (readiness: string) => {
    switch (readiness) {
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'not_ready':
        return <XCircle className="w-5 h-5 text-error" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getReadinessBadge = (readiness: string) => {
    switch (readiness) {
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>;
      case 'not_ready':
        return <Badge variant="error">Not Ready</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-error";
  };

  const renderIssuesList = (issues: any[], title: string, variant: 'error' | 'warning') => {
    if (!issues || issues.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className={`font-semibold text-sm ${variant === 'error' ? 'text-error' : 'text-warning'}`}>
          {title} ({issues.length})
        </h4>
        <div className="space-y-1">
          {issues.map((issue, index) => (
            <div key={index} className="text-sm p-2 border rounded">
              <div className="font-medium">{issue.type}: {issue.message}</div>
              {issue.resolution && (
                <div className="text-muted-foreground text-xs mt-1">
                  Resolution: {issue.resolution}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <CheckCircle className="w-8 h-8 text-success" />
              <div className="text-right">
                <div className="text-2xl font-bold text-success">
                  {readinessResults.filter(r => r.readiness === 'ready').length}
                </div>
                <div className="text-sm text-muted-foreground">Ready</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <div className="text-right">
                <div className="text-2xl font-bold text-warning">
                  {readinessResults.filter(r => r.readiness === 'degraded').length}
                </div>
                <div className="text-sm text-muted-foreground">Degraded</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <XCircle className="w-8 h-8 text-error" />
              <div className="text-right">
                <div className="text-2xl font-bold text-error">
                  {readinessResults.filter(r => r.readiness === 'not_ready').length}
                </div>
                <div className="text-sm text-muted-foreground">Not Ready</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <PlayCircle className="w-8 h-8 text-primary" />
              <Button onClick={onRunCheck} disabled={isRunning} className="flex-1 ml-4">
                <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'Checking...' : 'Run Check'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by hostname or IP address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Servers</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="not_ready">Not Ready</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Server List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Server Readiness Status ({filteredServers.length} servers)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredServers.map(server => (
              <div key={server.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {getReadinessIcon(server.readiness)}
                  <div>
                    <h4 className="font-semibold">{server.hostname}</h4>
                    <p className="text-sm text-muted-foreground">{server.ip_address}</p>
                    <div className="flex gap-2 mt-1">
                      {getReadinessBadge(server.readiness)}
                      {server.model && (
                        <Badge variant="outline" className="text-xs">{server.model}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(server.score)}`}>
                      {server.score}%
                    </div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>

                  {server.blocking_issues > 0 && (
                    <div className="text-center">
                      <div className="text-lg font-bold text-error">
                        {server.blocking_issues}
                      </div>
                      <div className="text-xs text-muted-foreground">Issues</div>
                    </div>
                  )}

                  {server.warnings > 0 && (
                    <div className="text-center">
                      <div className="text-lg font-bold text-warning">
                        {server.warnings}
                      </div>
                      <div className="text-xs text-muted-foreground">Warnings</div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewServerDetails(server.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredServers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? "No servers match the current filters"
                : "No servers found. Run discovery to add servers."
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Server Details Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Server Readiness Details</DialogTitle>
          </DialogHeader>
          {selectedServer && (
            <div className="space-y-6">
              {/* Overall Score */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Overall Readiness</h3>
                      <p className="text-sm text-muted-foreground">
                        Checked: {new Date(selectedServer.check_timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${getScoreColor(selectedServer.readiness_score)}`}>
                        {selectedServer.readiness_score}%
                      </div>
                      {getReadinessBadge(selectedServer.overall_readiness)}
                    </div>
                  </div>
                  <Progress value={selectedServer.readiness_score} className="mt-4" />
                </CardContent>
              </Card>

              {/* Check Results */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Network className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="font-semibold">Connectivity</h4>
                        <Badge variant={selectedServer.connectivity_status === 'pass' ? 'success' : 'error'}>
                          {selectedServer.connectivity_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Lock className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="font-semibold">Credentials</h4>
                        <Badge variant={selectedServer.credential_status === 'pass' ? 'success' : 'error'}>
                          {selectedServer.credential_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Package className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="font-semibold">Firmware Capability</h4>
                        <Badge variant={selectedServer.firmware_capability_status === 'pass' ? 'success' : 'error'}>
                          {selectedServer.firmware_capability_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Cloud className="w-6 h-6 text-primary" />
                      <div>
                        <h4 className="font-semibold">vCenter Integration</h4>
                        <Badge variant={
                          selectedServer.vcenter_integration_status === 'pass' ? 'success' :
                          selectedServer.vcenter_integration_status === 'not_applicable' ? 'outline' : 'error'
                        }>
                          {selectedServer.vcenter_integration_status || 'not_applicable'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Issues and Warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {renderIssuesList(selectedServer.blocking_issues, 'Blocking Issues', 'error')}
                </div>
                <div>
                  {renderIssuesList(selectedServer.warnings, 'Warnings', 'warning')}
                </div>
              </div>

              {/* No Issues */}
              {(!selectedServer.blocking_issues?.length && !selectedServer.warnings?.length) && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">All Checks Passed</h3>
                    <p className="text-muted-foreground">
                      This server is ready for firmware updates with no blocking issues or warnings.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}