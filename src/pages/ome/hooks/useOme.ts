import { useEffect, useState } from 'react';
import {
  omeDiscoverPreview,
  omeDiscoverRun,
  omeSchedule,
  omeCancelSchedule,
  listOmeRuns,
} from '@/lib/api';
import { useMutation, useQuery } from '@tanstack/react-query';

export interface OmeConnection {
  id: string;
  name: string;
  baseUrl: string;
}

const STORAGE_KEY = 'ome:selectedConnection';

export function useOme() {
  const [connection, setConnection] = useState<OmeConnection | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (connection) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [connection]);

  const preview = useMutation({
    mutationFn: (filter?: string) => {
      if (!connection) throw new Error('No connection');
      return omeDiscoverPreview(connection.id, filter);
    },
  });

  const run = useMutation({
    mutationFn: (filter?: string) => {
      if (!connection) throw new Error('No connection');
      return omeDiscoverRun(connection.id, filter);
    },
  });

  const schedule = useMutation({
    mutationFn: (vars: { everyMinutes: number; filter?: string }) => {
      if (!connection) throw new Error('No connection');
      return omeSchedule(connection.id, vars.everyMinutes, vars.filter);
    },
  });

  const cancel = useMutation({
    mutationFn: () => {
      if (!connection) throw new Error('No connection');
      return omeCancelSchedule(connection.id);
    },
  });

  const runs = useQuery({
    queryKey: ['omeRuns', connection?.id],
    queryFn: () => listOmeRuns(connection!.id),
    enabled: !!connection,
  });

  return {
    connection,
    setConnection,
    preview,
    run,
    schedule,
    cancel,
    runs,
  };
}
