import { useEffect, useState } from 'react';
import {
  omeDiscoverPreview,
  omeDiscoverRun,
  omeSchedule,
  omeCancelSchedule,
  listOmeRuns,
} from '@/lib/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useOmeConnections } from '@/hooks/useOmeConnections';

export function useOme() {
  const { selectedConnection: connection, setSelectedConnection } = useOmeConnections();

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
    setConnection: setSelectedConnection,
    preview,
    run,
    schedule,
    cancel,
    runs,
  };
}
