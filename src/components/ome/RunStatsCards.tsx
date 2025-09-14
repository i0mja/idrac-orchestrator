import { Card } from '@/components/ui/card';

interface Props {
  stats: { inserted?: number; updated?: number; skipped?: number; errors?: number; total?: number };
}

export function RunStatsCards({ stats }: Props) {
  const items = [
    { label: 'Inserted', value: stats.inserted ?? 0 },
    { label: 'Updated', value: stats.updated ?? 0 },
    { label: 'Skipped', value: stats.skipped ?? 0 },
    { label: 'Errors', value: stats.errors ?? 0 },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-4">
      {items.map((it) => (
        <Card key={it.label} className="p-4 text-center">
          <div className="text-sm text-muted-foreground">{it.label}</div>
          <div className="text-xl font-bold">{it.value}</div>
        </Card>
      ))}
      {stats.total !== undefined && (
        <div className="col-span-2 md:col-span-4 text-center text-sm">
          Total scanned: {stats.total}
        </div>
      )}
    </div>
  );
}
