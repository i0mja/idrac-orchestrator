import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Network, 
  Server, 
  MapPin, 
  Wifi, 
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  ZoomIn
} from 'lucide-react';

interface NetworkNode {
  id: string;
  type: 'datacenter' | 'subnet' | 'server';
  name: string;
  address?: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  children?: NetworkNode[];
  metadata?: {
    serverCount?: number;
    protocolSupport?: string[];
    lastSeen?: string;
    discoveryMethod?: string;
  };
}

interface NetworkTopologyProps {
  servers?: any[];
  datacenters?: any[];
  onNodeSelect?: (node: NetworkNode) => void;
  selectedNode?: NetworkNode | null;
}

export function NetworkTopology({ 
  servers = [], 
  datacenters = [], 
  onNodeSelect, 
  selectedNode 
}: NetworkTopologyProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');

  // Build network hierarchy from data
  const networkHierarchy = useMemo(() => {
    const nodes: NetworkNode[] = [];

    // Ensure servers is an array
    const serverList = Array.isArray(servers) ? servers : [];
    const datacenterList = Array.isArray(datacenters) ? datacenters : [];

    // Group servers by datacenter
    const serversByDatacenter = serverList.reduce((acc: Record<string, any[]>, server) => {
      const dcName = server.datacenter || 'Unknown';
      if (!acc[dcName]) acc[dcName] = [];
      acc[dcName].push(server);
      return acc;
    }, {} as Record<string, any[]>);

    // Create datacenter nodes
    Object.entries(serversByDatacenter).forEach(([dcName, dcServers]) => {
      const datacenter = datacenterList.find(dc => dc.name === dcName);
      const serverArray = Array.isArray(dcServers) ? dcServers : [];
      
      // Group servers by subnet within datacenter
      const serversBySubnet = serverArray.reduce((acc: Record<string, any[]>, server) => {
        const subnet = getSubnetFromIP(server.ip_address || '192.168.1.1');
        if (!acc[subnet]) acc[subnet] = [];
        acc[subnet].push(server);
        return acc;
      }, {} as Record<string, any[]>);

      // Create subnet nodes
      const subnetNodes: NetworkNode[] = Object.entries(serversBySubnet).map(([subnet, subnetServers]) => ({
        id: `${dcName}-${subnet}`,
        type: 'subnet',
        name: subnet,
        address: subnet,
        status: calculateSubnetHealth(Array.isArray(subnetServers) ? subnetServers : []),
        metadata: {
          serverCount: Array.isArray(subnetServers) ? subnetServers.length : 0,
          protocolSupport: getSubnetProtocols(Array.isArray(subnetServers) ? subnetServers : []),
          lastSeen: new Date().toISOString(),
        },
        children: (subnetServers || []).map(server => ({
          id: server.id || server.ip_address,
          type: 'server',
          name: server.hostname || server.ip_address,
          address: server.ip_address,
          status: getServerHealth(server),
          metadata: {
            protocolSupport: server.protocols?.map((p: any) => p.protocol) || [],
            lastSeen: server.lastDiscovered || server.last_seen,
            discoveryMethod: server.discoverySource || 'network',
          }
        }))
      }));

      nodes.push({
        id: dcName,
        type: 'datacenter',
        name: dcName,
        status: calculateDatacenterHealth(serverArray),
        metadata: {
          serverCount: serverArray.length,
          protocolSupport: getDatacenterProtocols(serverArray),
        },
        children: subnetNodes
      });
    });

    return nodes;
  }, [servers, datacenters]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'datacenter':
        return <MapPin className="w-4 h-4" />;
      case 'subnet':
        return <Network className="w-4 h-4" />;
      case 'server':
        return <Server className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const renderNode = (node: NetworkNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-primary/10 border border-primary/20' 
              : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => {
            if (hasChildren) toggleNode(node.id);
            if (onNodeSelect) onNodeSelect(node);
          }}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
              >
                {isExpanded ? '−' : '+'}
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            {getNodeIcon(node.type)}
            {getStatusIcon(node.status)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{node.name}</span>
                {node.address && (
                  <span className="text-xs text-muted-foreground">
                    {node.address}
                  </span>
                )}
              </div>
              {node.metadata?.serverCount && (
                <div className="text-xs text-muted-foreground">
                  {node.metadata.serverCount} server{node.metadata.serverCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {node.metadata?.protocolSupport?.map(protocol => (
                <Badge key={protocol} variant="outline" className="text-xs px-1">
                  {protocol}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="space-y-1">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Network Topology
            </CardTitle>
            <CardDescription>
              Hierarchical view of discovered network infrastructure
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              Tree
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {networkHierarchy.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No network topology available</p>
            <p className="text-sm">Run discovery to populate network map</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {networkHierarchy.map(node => renderNode(node))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper functions
function getSubnetFromIP(ip: string): string {
  const parts = ip.split('.');
  return parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : 'Unknown';
}

function calculateSubnetHealth(servers: any[]): 'healthy' | 'warning' | 'error' {
  const healthyCount = servers.filter(s => getServerHealth(s) === 'healthy').length;
  const healthyPercentage = healthyCount / servers.length;
  
  if (healthyPercentage >= 0.8) return 'healthy';
  if (healthyPercentage >= 0.5) return 'warning';
  return 'error';
}

function calculateDatacenterHealth(servers: any[]): 'healthy' | 'warning' | 'error' {
  return calculateSubnetHealth(servers);
}

function getServerHealth(server: any): 'healthy' | 'warning' | 'error' {
  if (server.status === 'connected' || server.healthiestProtocol) return 'healthy';
  if (server.protocols && server.protocols.some((p: any) => p.supported)) return 'warning';
  return 'error';
}

function getSubnetProtocols(servers: any[]): string[] {
  const protocols = new Set<string>();
  servers.forEach(server => {
    if (server.protocols && Array.isArray(server.protocols)) {
      server.protocols.forEach((p: any) => {
        if (p.supported) protocols.add(p.protocol);
      });
    }
  });
  return Array.from(protocols);
}

function getDatacenterProtocols(servers: any[]): string[] {
  return getSubnetProtocols(servers);
}