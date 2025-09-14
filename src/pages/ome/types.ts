export type OmeRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'succeeded' | 'failed';
  stats: Record<string, unknown>;
};

export type Host = {
  id: string;
  fqdn: string;
  mgmtIp: string;
  model?: string | null;
  serviceTag?: string | null;
  clusterMoid?: string | null;
  mgmtKind?: string | null;
  tags?: string[] | null;
};
