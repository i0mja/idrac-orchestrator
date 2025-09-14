import { OmeConnectionManager } from '@/components/ome/OmeConnectionManager';
import { RunStatsCards } from '@/components/ome/RunStatsCards';
import { useOme } from './hooks/useOme';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export function RunsTab() {
  const { runs } = useOme();
  const data = runs.data?.runs ?? [];

  return (
    <div className="space-y-4">
      <OmeConnectionManager />
      {data.length === 0 && <p>No runs yet—try a Preview or Import.</p>}
      {data.length > 0 && (
        <>
          <RunStatsCards stats={data[0].stats} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 50).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.startedAt}</TableCell>
                  <TableCell>{r.finishedAt}</TableCell>
                  <TableCell>{r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={() => runs.refetch()}>Refresh</Button>
        </>
      )}
    </div>
  );
}
