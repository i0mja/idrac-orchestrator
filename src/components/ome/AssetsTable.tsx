import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useHosts } from '@/pages/ome/hooks/useHosts';
import type { Host } from '@/pages/ome/types';
import { HostDetailDrawer } from './HostDetailDrawer';

export function AssetsTable() {
  const { data: hosts = [], clusters, tags } = useHosts();
  const [query, setQuery] = useState('');
  const [cluster, setCluster] = useState('all');
  const [tag, setTag] = useState('all');
  const [source, setSource] = useState('all');
  const [selected, setSelected] = useState<Host | null>(null);

  const filtered = useMemo(() => {
    return hosts.filter((h) => {
      const q = query.toLowerCase();
      const matchesQ =
        h.fqdn.toLowerCase().includes(q) ||
        h.serviceTag?.toLowerCase().includes(q) ||
        h.mgmtIp.includes(q);
      if (!matchesQ) return false;
      if (cluster !== 'all' && h.clusterMoid !== cluster) return false;
      if (tag !== 'all' && !h.tags?.includes(tag)) return false;
      const src = h.serviceTag || h.tags?.includes('ome') ? 'ome' : 'manual';
      if (source !== 'all' && src !== source) return false;
      return true;
    });
  }, [hosts, query, cluster, tag, source]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ome">OME</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cluster} onValueChange={setCluster}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Cluster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {clusters.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hostname</TableHead>
            <TableHead>Mgmt IP</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Service Tag</TableHead>
            <TableHead>Cluster</TableHead>
            <TableHead>Mgmt Kind</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((h) => {
            const src = h.serviceTag || h.tags?.includes('ome') ? 'OME' : 'Manual';
            return (
              <TableRow key={h.id} className="cursor-pointer" onClick={() => setSelected(h)}>
                <TableCell>{h.fqdn}</TableCell>
                <TableCell>{h.mgmtIp}</TableCell>
                <TableCell>{h.model}</TableCell>
                <TableCell>{h.serviceTag}</TableCell>
                <TableCell>{h.clusterMoid}</TableCell>
                <TableCell>{h.mgmtKind}</TableCell>
                <TableCell>
                  <Badge>{src}</Badge>
                </TableCell>
                <TableCell>{h.tags?.join(', ')}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <HostDetailDrawer host={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
