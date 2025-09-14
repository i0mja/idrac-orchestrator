import { OmeConnectionManager } from '@/components/ome/OmeConnectionManager';
import { AssetsTable } from '@/components/ome/AssetsTable';

export function AssetsTab() {
  return (
    <div className="space-y-4">
      <OmeConnectionManager />
      <AssetsTable />
    </div>
  );
}
