import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listHosts } from '@/lib/api';
import type { Host } from '../types';

export function useHosts() {
  const query = useQuery<Host[]>({ queryKey: ['hosts'], queryFn: listHosts });

  const clusters = useMemo(() => {
    const set = new Set<string>();
    (query.data ?? []).forEach((h) => {
      if (h.clusterMoid) set.add(h.clusterMoid);
    });
    return Array.from(set);
  }, [query.data]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    (query.data ?? []).forEach((h) => h.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [query.data]);

  const source = useMemo(() => {
    const hosts = query.data ?? [];
    return hosts.reduce(
      (acc, h) => {
        const isOme = !!h.serviceTag || h.tags?.includes('ome');
        acc[isOme ? 'ome' : 'manual']++;
        return acc;
      },
      { ome: 0, manual: 0 }
    );
  }, [query.data]);

  return { ...query, clusters, tags, source };
}
